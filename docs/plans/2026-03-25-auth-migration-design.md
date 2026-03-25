# Auth Migration Design

**Date:** 2026-03-25

## Goal

Migrate the first standalone authentication slice onto the new `apps/api` + `apps/web` stack without reusing the legacy PHP session model.

This slice only covers:

- register
- login
- logout
- current session lookup (`me`)

Out of scope for this slice:

- legacy PHP page rewrites
- password reset
- user control panel
- admin control panel
- forum integration
- rankings integration

## Constraints

- Only modify the migrated stack: `apps/web` and `apps/api`
- Do not use the legacy PHP `$_SESSION` flow
- Do not store plaintext passwords anywhere in the system
- The client hashes the password before sending it
- Request contracts should not expose the concrete hash algorithm in field names
- Login success writes a token into browser local storage
- `apps/web/src/app/http/HttpClient` remains the shared transport layer
- Page-level HTTP requests stay inside the consuming module's `index.service.ts`
- The backend must perform auth checks in a centralized pre-handler or middleware layer
- Tokens do not expire automatically, but the database can revoke them
- Multiple active tokens per user are allowed

## Architecture

The authentication migration uses a database-backed token model rather than PHP sessions or JWTs.

The client submits `passwordHash` during register and login. The backend stores the received hash in the new auth tables, generates a random opaque token on successful auth, persists that token in MySQL, and returns it to the frontend. The frontend stores that token in `localStorage`, and the existing `HttpClient` attaches it as a Bearer token on later requests.

ASP.NET Core adds a centralized auth middleware that resolves the current user from the Bearer token before endpoint execution. Public endpoints continue anonymously, while protected endpoints require a resolved auth context.

## Data Model

Create a new SQL bootstrap file under `resources/sql/cms_auth.sql`.

### `cms_users`

- `id`
- `username`
- `email`
- `password_hash`
- `role`
- `status`
- `created_at`
- `updated_at`

Rules:

- `username` unique
- `email` unique
- `role` initially supports `user` and `admin`
- `status` initially supports `active` and `disabled`

### `cms_auth_tokens`

- `id`
- `user_id`
- `token`
- `created_at`
- `last_used_at`
- `revoked_at`
- `revoked_reason`
- `client_ip`
- `user_agent`

Rules:

- `token` unique
- `user_id` foreign key to `cms_users.id`
- one user may hold multiple active tokens
- a token is valid only when `revoked_at` is `NULL`

## API Contract

All routes live under `/api/v1/auth`.

### `POST /register`

Request:

```json
{
  "username": "player1",
  "email": "player1@example.com",
  "passwordHash": "<client-side hash>"
}
```

Behavior:

- validate input
- create a user in `cms_users`
- create an auth token in `cms_auth_tokens`
- return authenticated state immediately

Response:

```json
{
  "token": "<opaque-token>",
  "user": {
    "id": 1,
    "username": "player1",
    "email": "player1@example.com",
    "role": "user"
  }
}
```

### `POST /login`

Request:

```json
{
  "username": "player1",
  "passwordHash": "<client-side hash>"
}
```

Behavior:

- look up the user from `cms_users`
- compare the stored `password_hash`
- reject disabled users
- issue and persist a new token on success

Response shape matches `/register`.

Failure response:

- invalid username
- invalid password hash match
- disabled account

All return the same client-facing response:

```json
{
  "code": "auth.invalid_credentials",
  "message": "Invalid username or password."
}
```

The backend logs the detailed failure reason internally.

### `POST /logout`

Requirements:

- Bearer token required

Behavior:

- revoke the current token only

Response:

- `204 No Content`

### `GET /me`

Requirements:

- Bearer token required

Behavior:

- resolve the current user from the active token

Response:

```json
{
  "user": {
    "id": 1,
    "username": "player1",
    "email": "player1@example.com",
    "role": "user"
  }
}
```

If the Bearer token is missing or invalid, return `401` with an empty body.

### Error Response Shape

```json
{
  "code": "auth.invalid_credentials",
  "message": "Invalid username or password.",
  "fieldErrors": {
    "username": [
      "Username is required."
    ]
  }
}
```

`fieldErrors` is optional and only present for validation failures.

Protected auth failures caused by invalid or missing tokens return an empty `401` body instead of a JSON error payload.

## Backend Design

### Files and Responsibilities

- `apps/api/Endpoints/AuthEndpoints.cs`
  Expose register, login, logout, and me endpoints.
- `apps/api/Contracts/Auth/*`
  Request and response DTOs for auth routes.
- `apps/api/Services/AuthService.cs`
  Coordinate registration, login, logout, and current-user lookup.
- `apps/api/Infrastructure/AuthRepository.cs`
  Read and write `cms_users` and `cms_auth_tokens`.
- `apps/api/Infrastructure/AuthTokenFactory.cs`
  Generate random opaque tokens.
- `apps/api/Infrastructure/CmsAuthMiddleware.cs`
  Parse Bearer tokens, resolve current user, and enforce protected routes.
- `apps/api/Infrastructure/CmsAuthContext.cs`
  Represent the resolved auth user for the current request.
- `apps/api/Infrastructure/RequireCmsAuthAttribute.cs`
  Mark protected endpoints.
- `apps/api/Program.cs`
  Register auth services, middleware, and endpoints.

### Middleware Behavior

- inspect `Authorization: Bearer <token>`
- if the header is absent, continue without auth context
- if the header exists, resolve the token from `cms_auth_tokens`
- if the token is active, attach the current auth user to `HttpContext.Items`
- if a protected endpoint is requested without a valid auth context, return `401`

### Public Endpoints

These endpoints remain anonymous:

- `/api/v1/health`
- `/api/v1/config`
- `/api/v1/auth/register`
- `/api/v1/auth/login`

### Protected Endpoints

These endpoints require auth in this slice:

- `/api/v1/auth/logout`
- `/api/v1/auth/me`

## Frontend Design

### Files and Responsibilities

- `apps/web/src/pages/Login/index.tsx`
- `apps/web/src/pages/Login/index.module.scss`
- `apps/web/src/pages/Login/index.service.ts`
- `apps/web/src/pages/Register/index.tsx`
- `apps/web/src/pages/Register/index.module.scss`
- `apps/web/src/pages/Register/index.service.ts`
- `apps/web/src/app/auth/*`
  Shared auth state, token persistence, and current-user restoration
- `apps/web/src/components/AppShell/index.tsx`
  Render login-aware navigation and logout affordance
- `apps/web/src/app/router/index.tsx`
  Register `/login` and `/register`

### Frontend Flow

#### Register

- user fills username, email, and password
- the page hashes the password client-side
- the page calls `POST /api/v1/auth/register`
- on success, persist `token` in `localStorage`
- update auth state and redirect to `/`

#### Login

- user fills username and password
- the page hashes the password client-side
- the page calls `POST /api/v1/auth/login`
- on success, persist `token` in `localStorage`
- update auth state and redirect to `/`

#### App Boot

- load token from `localStorage`
- if a token exists, call `GET /api/v1/auth/me`
- if `me` succeeds, keep the user signed in
- if `me` returns `401`, remove the token from local storage

#### Logout

- call `POST /api/v1/auth/logout`
- remove token from `localStorage`
- clear auth state

### Navigation Rules

Only expose migrated auth routes:

- anonymous users: `Home`, `Login`, `Register`
- authenticated users: `Home`, current username, `Logout`

Do not expose the un-migrated user control panel or admin modules.

## Legacy Data Handling

Legacy mixed password records from the inherited SQL dump are intentionally ignored.

This migration does not attempt:

- compatibility with plaintext legacy passwords
- compatibility with legacy bcrypt rows
- bridging the old `users` authentication logic

The new auth slice starts from the new tables only.

## Security Tradeoffs

- The system does not store plaintext passwords.
- The contract uses `passwordHash` instead of naming the algorithm directly.
- The server still trusts the client to provide a hash. This is weaker than server-side password hashing, but it matches the explicit product requirement for this migration.
- Tokens are stored in plaintext in the database by explicit product choice for easier invalidation and operational visibility.
- Because tokens are stored in plaintext and have no automatic expiry, revocation paths must be reliable and simple.

## Testing Strategy

### Frontend

- service tests for login and register requests
- page tests for login and register flows
- auth state tests for token restore and logout
- `AppShell` tests for anonymous vs authenticated navigation states

### Backend

- add `apps/api.tests`
- service tests for register, login, logout, and me behavior
- middleware tests for anonymous, authorized, and unauthorized flows
- minimal endpoint-level verification for:
  - register
  - me
  - logout

## Incremental Delivery

Implement this slice in the following order:

1. SQL bootstrap file
2. backend auth contracts, repository, service, and middleware
3. protected `/auth/me` and `/auth/logout`
4. public `/auth/register` and `/auth/login`
5. frontend auth state utilities
6. login and register pages
7. navigation integration
8. full test, lint, and build verification
