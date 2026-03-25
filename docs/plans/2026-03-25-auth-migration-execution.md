# Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first standalone auth slice on the new `apps/api` + `apps/web` stack, covering register, login, logout, and current-user lookup without reusing legacy PHP sessions.

**Architecture:** The backend introduces new `cms_users` and `cms_auth_tokens` tables, database-backed opaque tokens, and centralized Bearer token middleware. The frontend adds login and register pages, local token persistence, and app-level auth state restoration while continuing to reuse `apps/web/src/app/http/HttpClient`.

**Tech Stack:** ASP.NET Core 10, MySqlConnector, xUnit, React 19, TypeScript, Vite, SCSS, react-router-dom, rxjs, Vitest

---

## Chunk 1: Backend Auth Foundation

### Task 1: Reconfirm the current repository baseline

**Files:**
- Verify: `AGENTS.md`
- Verify: `docs/plans/2026-03-25-auth-migration-design.md`
- Verify: `apps/api/Program.cs`
- Verify: `apps/web/src/app/http/HttpClient/index.ts`
- Verify: `apps/web/src/components/AppShell/index.tsx`

- [ ] **Step 1: Record the current working tree**

Run: `git status --short`
Expected: capture the already-dirty workspace before touching auth files; do not discard or stage unrelated existing changes

- [ ] **Step 2: Reconfirm the auth design**

Read:
- `docs/plans/2026-03-25-auth-migration-design.md`
- `apps/api/Program.cs`
- `apps/web/src/app/http/HttpClient/index.ts`

Expected: the implementation still matches the approved auth slice and existing token transport behavior

- [ ] **Step 3: Reconfirm current verification baselines**

Run:
- `cd apps/web && npm run test`
- `cd apps/web && npm run lint`
- `cd apps/web && npm run build`
- `dotnet build apps/api`

Expected: all commands pass before auth work starts

### Task 2: Add the auth SQL bootstrap

**Files:**
- Create: `resources/sql/cms_auth.sql`

- [ ] **Step 1: Write the SQL file**

Create:

```sql
CREATE TABLE IF NOT EXISTS cms_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash CHAR(128) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cms_users_username (username),
  UNIQUE KEY uq_cms_users_email (email)
);

CREATE TABLE IF NOT EXISTS cms_auth_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME NULL,
  revoked_at DATETIME NULL,
  revoked_reason VARCHAR(255) NULL,
  client_ip VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cms_auth_tokens_token (token),
  KEY ix_cms_auth_tokens_user_id_revoked_at (user_id, revoked_at),
  CONSTRAINT fk_cms_auth_tokens_user_id
    FOREIGN KEY (user_id) REFERENCES cms_users (id)
      ON DELETE CASCADE
);
```

- [ ] **Step 2: Review the SQL contract against the design**

Check:
- `password_hash` uses a neutral name
- `token` is stored in plaintext by explicit product choice
- no legacy tables are modified or dropped

- [ ] **Step 3: Commit the SQL bootstrap**

```bash
git add resources/sql/cms_auth.sql
git commit -m "feat: add auth schema bootstrap"
```

### Task 3: Add backend test coverage for auth service and middleware

**Files:**
- Create: `apps/api.tests/api.tests.csproj`
- Create: `apps/api.tests/Auth/AuthServiceTests.cs`
- Create: `apps/api.tests/Auth/CmsAuthMiddlewareTests.cs`
- Create: `apps/api.tests/Auth/TestDoubles/InMemoryAuthRepository.cs`
- Create: `apps/api.tests/Auth/TestDoubles/FakeAuthTokenFactory.cs`
- Create: `apps/api.tests/Auth/TestDoubles/TestHttpContextAccessor.cs`

- [ ] **Step 1: Create the test project**

Use a new SDK-style project targeting `net10.0` with:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="18.0.0" />
    <PackageReference Include="xunit" Version="2.9.3" />
    <PackageReference Include="xunit.runner.visualstudio" Version="3.1.5" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="../api/api.csproj" />
  </ItemGroup>
</Project>
```

- [ ] **Step 2: Write the first failing auth service tests**

Cover:
- register creates a user and returns a token
- login rejects invalid credentials
- logout revokes only the current token
- me resolves the current user from the current token

- [ ] **Step 3: Run the backend test target to verify red**

Run: `dotnet test apps/api.tests --filter AuthServiceTests`
Expected: FAIL because auth service and repository abstractions do not exist yet

- [ ] **Step 4: Write the first failing middleware tests**

Cover:
- anonymous request to public endpoint continues
- protected endpoint without token returns `401`
- protected endpoint with active token attaches auth context and continues

- [ ] **Step 5: Run the middleware test target to verify red**

Run: `dotnet test apps/api.tests --filter CmsAuthMiddlewareTests`
Expected: FAIL because the middleware and auth context types do not exist yet

### Task 4: Implement backend auth models, repository abstractions, and service

**Files:**
- Create: `apps/api/Contracts/Auth/AuthUserResponse.cs`
- Create: `apps/api/Contracts/Auth/AuthSessionResponse.cs`
- Create: `apps/api/Contracts/Auth/LoginRequest.cs`
- Create: `apps/api/Contracts/Auth/RegisterRequest.cs`
- Create: `apps/api/Contracts/Auth/CurrentUserResponse.cs`
- Create: `apps/api/Contracts/Auth/ApiErrorResponse.cs`
- Create: `apps/api/Services/AuthService.cs`
- Create: `apps/api/Services/IAuthRepository.cs`
- Create: `apps/api/Infrastructure/AuthRepository.cs`
- Create: `apps/api/Infrastructure/AuthTokenFactory.cs`
- Create: `apps/api/Infrastructure/CmsAuthContext.cs`

- [ ] **Step 1: Add the DTOs and service contracts**

Create minimal request and response records such as:

```csharp
public sealed record LoginRequest(string Username, string PasswordHash);

public sealed record AuthSessionResponse(
    string Token,
    AuthUserResponse User);
```

- [ ] **Step 2: Add the repository contract**

The repository should expose focused methods such as:

```csharp
Task<AuthUserRecord?> GetUserByUsernameAsync(string username, CancellationToken cancellationToken);
Task<AuthUserRecord?> GetUserByIdAsync(long userId, CancellationToken cancellationToken);
Task<AuthTokenRecord?> GetActiveTokenAsync(string token, CancellationToken cancellationToken);
Task<AuthUserRecord> CreateUserAsync(...);
Task CreateTokenAsync(...);
Task RevokeTokenAsync(string token, string revokedReason, CancellationToken cancellationToken);
Task TouchTokenAsync(string token, CancellationToken cancellationToken);
```

- [ ] **Step 3: Add the first minimal `AuthService` implementation**

Implement:
- register
- login
- logout
- get current user by token

Validation requirements:
- `username`, `email`, and `passwordHash` cannot be blank
- `passwordHash` must be exactly 128 hex characters
- duplicate username or email returns a structured conflict error
- disabled users cannot log in

- [ ] **Step 4: Re-run the auth service tests**

Run: `dotnet test apps/api.tests --filter AuthServiceTests`
Expected: PASS

### Task 5: Implement MySQL auth repository and token factory

**Files:**
- Modify: `apps/api/Infrastructure/LegacyCmsConnectionFactory.cs`
- Modify: `apps/api/Infrastructure/AuthRepository.cs`
- Modify: `apps/api/Infrastructure/AuthTokenFactory.cs`

- [ ] **Step 1: Extend the connection factory only if needed**

If the repository can use `CreateGameConnection()` directly, do not add new connection factory surface area. Keep the current database boundary minimal.

- [ ] **Step 2: Implement the repository against `cms_users` and `cms_auth_tokens`**

Use explicit SQL statements for:
- user lookup by username and id
- duplicate username/email checks
- user creation
- token creation
- active token lookup
- token touch
- token revoke

- [ ] **Step 3: Implement opaque token generation**

Generate random 64-character hex tokens, for example via 32 secure random bytes converted to lowercase hex.

- [ ] **Step 4: Re-run the backend tests**

Run:
- `dotnet test apps/api.tests --filter AuthServiceTests`
- `dotnet test apps/api.tests --filter CmsAuthMiddlewareTests`

Expected: service tests stay green; middleware tests may still be red until middleware is added

### Task 6: Implement centralized auth middleware and endpoint metadata

**Files:**
- Create: `apps/api/Infrastructure/RequireCmsAuthAttribute.cs`
- Create: `apps/api/Infrastructure/CmsAuthHttpContextExtensions.cs`
- Create: `apps/api/Infrastructure/CmsAuthMiddleware.cs`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Add a metadata marker for protected endpoints**

Create a simple attribute or marker type such as:

```csharp
public sealed class RequireCmsAuthAttribute : Attribute
{
}
```

- [ ] **Step 2: Add the first minimal middleware**

Flow:
- inspect `Authorization`
- resolve the token if present
- attach auth context to `HttpContext.Items`
- if the selected endpoint has `RequireCmsAuthAttribute` and no auth context exists, return `401`

- [ ] **Step 3: Register the middleware in `Program.cs`**

Registration order:
- OpenAPI and CORS
- HTTPS redirection
- CMS auth middleware
- endpoint mapping

- [ ] **Step 4: Re-run the middleware tests**

Run: `dotnet test apps/api.tests --filter CmsAuthMiddlewareTests`
Expected: PASS

### Task 7: Add auth endpoints and endpoint-level verification

**Files:**
- Create: `apps/api/Endpoints/AuthEndpoints.cs`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Write the failing endpoint tests**

Add endpoint-level tests for:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

- [ ] **Step 2: Run the endpoint test target to verify red**

Run: `dotnet test apps/api.tests --filter AuthEndpoint`
Expected: FAIL because the endpoints are not registered yet

- [ ] **Step 3: Implement `AuthEndpoints.cs`**

Map:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

Protected endpoints must be tagged with `RequireCmsAuthAttribute`.

- [ ] **Step 4: Register the auth endpoints**

In `Program.cs`, add:

```csharp
app.MapAuthEndpoints();
```

- [ ] **Step 5: Re-run all backend auth tests**

Run: `dotnet test apps/api.tests`
Expected: PASS

- [ ] **Step 6: Commit the backend auth slice**

```bash
git add apps/api apps/api.tests
git commit -m "feat: add api auth foundation"
```

## Chunk 2: Frontend Auth Integration

### Task 8: Add frontend auth utility coverage first

**Files:**
- Create: `apps/web/src/app/auth/index.ts`
- Create: `apps/web/src/app/auth/index.test.ts`
- Create: `apps/web/src/app/auth/types.ts`

- [ ] **Step 1: Write the failing auth utility tests**

Cover:
- persisting the token to `localStorage`
- clearing the token on logout
- restoring current user state from `/api/v1/auth/me`
- clearing invalid tokens after a `401`

- [ ] **Step 2: Run the utility test target to verify red**

Run: `cd apps/web && npm run test -- src/app/auth/index.test.ts`
Expected: FAIL because the auth utility module does not exist yet

- [ ] **Step 3: Implement the auth utility module**

Keep it focused:
- `setAuthToken`
- `getAuthToken`
- `clearAuthToken`
- `restoreAuthSession`

- [ ] **Step 4: Re-run the utility tests**

Run: `cd apps/web && npm run test -- src/app/auth/index.test.ts`
Expected: PASS

### Task 9: Add login page service and interaction tests

**Files:**
- Create: `apps/web/src/pages/Login/index.tsx`
- Create: `apps/web/src/pages/Login/index.module.scss`
- Create: `apps/web/src/pages/Login/index.service.ts`
- Create: `apps/web/src/pages/Login/index.service.test.ts`
- Create: `apps/web/src/pages/Login/index.test.tsx`

- [ ] **Step 1: Write the failing login service test**

Verify `index.service.ts` posts to `/auth/login` through `HttpClient`:

```ts
expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/auth/login')
```

- [ ] **Step 2: Run the login service test to verify red**

Run: `cd apps/web && npm run test -- src/pages/Login/index.service.test.ts`
Expected: FAIL because the login page module does not exist yet

- [ ] **Step 3: Implement the minimal login service**

Use explicit Promise chaining and keep the endpoint path inside the page-local service module.

- [ ] **Step 4: Write the failing login page test**

Cover:
- user enters username and password
- the page hashes the password client-side
- the page calls the service
- success writes the token and redirects

- [ ] **Step 5: Run the login page test to verify red**

Run: `cd apps/web && npm run test -- src/pages/Login/index.test.tsx`
Expected: FAIL because the page component does not exist yet

- [ ] **Step 6: Implement the login page**

Requirements:
- use a dedicated page folder with `index.tsx`, `index.module.scss`, and `index.service.ts`
- use `window.crypto.subtle.digest('SHA-512', ...)` for client-side hashing
- keep handler names descriptive and in `handle + Action` form

- [ ] **Step 7: Re-run the login tests**

Run:
- `cd apps/web && npm run test -- src/pages/Login/index.service.test.ts`
- `cd apps/web && npm run test -- src/pages/Login/index.test.tsx`

Expected: PASS

### Task 10: Add register page service and interaction tests

**Files:**
- Create: `apps/web/src/pages/Register/index.tsx`
- Create: `apps/web/src/pages/Register/index.module.scss`
- Create: `apps/web/src/pages/Register/index.service.ts`
- Create: `apps/web/src/pages/Register/index.service.test.ts`
- Create: `apps/web/src/pages/Register/index.test.tsx`

- [ ] **Step 1: Write the failing register service test**

Verify the register page service posts to `/auth/register` with:

```ts
{
  username,
  email,
  passwordHash,
}
```

- [ ] **Step 2: Run the register service test to verify red**

Run: `cd apps/web && npm run test -- src/pages/Register/index.service.test.ts`
Expected: FAIL because the register page module does not exist yet

- [ ] **Step 3: Implement the minimal register service**

Use explicit Promise chains and do not create a central services directory.

- [ ] **Step 4: Write the failing register page test**

Cover:
- field validation
- client-side hashing
- successful registration stores token and redirects

- [ ] **Step 5: Run the register page test to verify red**

Run: `cd apps/web && npm run test -- src/pages/Register/index.test.tsx`
Expected: FAIL because the page component does not exist yet

- [ ] **Step 6: Implement the register page**

Keep the UI aligned with the existing migration frontend visual language; do not expose un-migrated modules from this screen.

- [ ] **Step 7: Re-run the register tests**

Run:
- `cd apps/web && npm run test -- src/pages/Register/index.service.test.ts`
- `cd apps/web && npm run test -- src/pages/Register/index.test.tsx`

Expected: PASS

### Task 11: Wire router, shell navigation, and logout behavior

**Files:**
- Modify: `apps/web/src/app/router/index.tsx`
- Modify: `apps/web/src/app/router/index.test.tsx`
- Modify: `apps/web/src/components/AppShell/index.tsx`
- Modify: `apps/web/src/components/AppShell/index.module.scss`
- Modify: `apps/web/src/components/AppShell/index.test.tsx`

- [ ] **Step 1: Write the failing router and shell tests**

Cover:
- `/login` and `/register` lazy routes exist
- anonymous navigation exposes `Home`, `Login`, `Register`
- authenticated navigation exposes `Home`, current username, `Logout`
- logout clears token and returns the UI to anonymous state

- [ ] **Step 2: Run the router and shell test targets to verify red**

Run:
- `cd apps/web && npm run test -- src/app/router/index.test.tsx`
- `cd apps/web && npm run test -- src/components/AppShell/index.test.tsx`

Expected: FAIL because auth-aware routes and navigation do not exist yet

- [ ] **Step 3: Implement router changes**

Add lazy routes for:
- `/login`
- `/register`

Keep `/playground` routable but still hidden from primary navigation.

- [ ] **Step 4: Implement shell auth state integration**

`AppShell` should:
- restore auth state on app boot
- show the correct nav actions for anonymous vs authenticated users
- call `/api/v1/auth/logout` through a small page-local or auth-local helper

- [ ] **Step 5: Re-run the router and shell tests**

Run:
- `cd apps/web && npm run test -- src/app/router/index.test.tsx`
- `cd apps/web && npm run test -- src/components/AppShell/index.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit the frontend auth slice**

```bash
git add apps/web
git commit -m "feat: add web auth flow"
```

### Task 12: Run full verification before completion

**Files:**
- Verify: all files changed by Tasks 2-11

- [ ] **Step 1: Run the full frontend test suite**

Run: `cd apps/web && npm run test`
Expected: PASS

- [ ] **Step 2: Run the frontend lint step**

Run: `cd apps/web && npm run lint`
Expected: PASS

- [ ] **Step 3: Run the frontend production build**

Run: `cd apps/web && npm run build`
Expected: PASS

- [ ] **Step 4: Run the backend build**

Run: `dotnet build apps/api`
Expected: PASS

- [ ] **Step 5: Run the backend test suite**

Run: `dotnet test apps/api.tests`
Expected: PASS

- [ ] **Step 6: Record the final working tree**

Run: `git status --short`
Expected: only the intended auth files and any pre-existing unrelated workspace files appear
