# CMS User Settings Mutation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add migrated change-email and change-password flows to the CMS `User Control Panel` while removing the current implicit game-account lookup.

**Architecture:** The backend adds protected REST endpoints plus a reusable verification-code table. The frontend extends the existing `/user-cp` page with website settings forms and keeps all page-owned requests inside `index.service.ts`. The current username-based direct game lookup is removed so unavailable game-side values display `-`.

**Tech Stack:** ASP.NET Core 10, xUnit, React 19, TypeScript, Vite, SCSS, react-router-dom, Vitest

---

## Chunk 1: Baseline and SQL

### Task 1: Reconfirm baseline and current user settings surface

**Files:**
- Verify: `AGENTS.md`
- Verify: `docs/superpowers/specs/2026-03-26-cms-user-settings-mutation-design.md`
- Verify: `apps/api/Program.cs`
- Verify: `apps/api/Infrastructure/AuthRepository.cs`
- Verify: `apps/api/Infrastructure/UserProfileRepository.cs`
- Verify: `apps/web/src/pages/UserControlPanel/index.tsx`
- Verify: `apps/web/src/pages/UserControlPanel/index.service.ts`

- [ ] **Step 1: Record the current working tree**

Run: `git status --short`
Expected: only pre-existing unrelated files remain, such as `?? resources/sql/Awaken.psd`

- [ ] **Step 2: Reconfirm the current verification baseline**

Run:
- `dotnet test apps/api.tests`
- `dotnet build apps/api`
- `cd apps/web && npm run test`
- `cd apps/web && npm run lint`
- `cd apps/web && npm run build`

Expected: all commands pass before touching user-settings files

### Task 2: Add the verification-code SQL bootstrap

**Files:**
- Create: `resources/sql/cms_user_verification_codes.sql`

- [ ] **Step 1: Write the SQL file**

Create:

```sql
CREATE TABLE IF NOT EXISTS cms_user_verification_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  operation VARCHAR(64) NOT NULL,
  target_value VARCHAR(255) NOT NULL,
  verification_code CHAR(6) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  invalidated_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY ix_cms_user_verification_codes_user_operation (user_id, operation),
  KEY ix_cms_user_verification_codes_lookup (user_id, operation, target_value),
  CONSTRAINT fk_cms_user_verification_codes_user_id
    FOREIGN KEY (user_id) REFERENCES cms_users (id)
      ON DELETE CASCADE
);
```

- [ ] **Step 2: Review the table contract**

Check:
- code stays plaintext by product decision
- target email is stored as `target_value`
- the table can be reused by future operations

## Chunk 2: Backend TDD for user settings

### Task 3: Add failing backend tests for user settings service and endpoints

**Files:**
- Create: `apps/api.tests/UserSettings/UserSettingsServiceTests.cs`
- Create: `apps/api.tests/UserSettings/UserSettingsEndpointTests.cs`
- Create: `apps/api.tests/UserSettings/TestDoubles/InMemoryUserSettingsRepository.cs`
- Modify: `apps/api.tests/Auth/TestDoubles/AuthApiFactory.cs`
- Modify: existing backend test doubles if token revocation helpers are needed

- [ ] **Step 1: Write the first failing service tests**

Cover:
- email verification code is generated for a valid current password and new email
- unexpired code is reused for the same user + operation + target email
- changing the target email invalidates the previous pending code
- email change succeeds with a valid code
- email change rejects invalid or expired codes
- password change revokes all active user tokens

- [ ] **Step 2: Run the focused service tests to verify red**

Run: `dotnet test apps/api.tests --filter UserSettingsServiceTests`
Expected: FAIL because the user-settings service and repository abstractions do not exist yet

- [ ] **Step 3: Write the first failing endpoint tests**

Cover:
- protected send-code endpoint returns `401` when unauthenticated
- send-code endpoint returns `verificationCodePreview` for the temporary phase
- change-email endpoint updates the email for a valid request
- change-password endpoint returns `204` and later rejects the revoked token

- [ ] **Step 4: Run the focused endpoint tests to verify red**

Run: `dotnet test apps/api.tests --filter UserSettingsEndpointTests`
Expected: FAIL because the new endpoints are not mapped yet

### Task 4: Implement the backend user-settings slice

**Files:**
- Create: `apps/api/Contracts/UserSettings/SendEmailVerificationCodeRequest.cs`
- Create: `apps/api/Contracts/UserSettings/SendEmailVerificationCodeResponse.cs`
- Create: `apps/api/Contracts/UserSettings/ChangeEmailRequest.cs`
- Create: `apps/api/Contracts/UserSettings/ChangePasswordRequest.cs`
- Create: `apps/api/Endpoints/UserSettingsEndpoints.cs`
- Create: `apps/api/Services/UserSettingsService.cs`
- Create: `apps/api/Services/UserSettingsRecords.cs`
- Create: `apps/api/Services/IUserSettingsRepository.cs`
- Create: `apps/api/Infrastructure/UserSettingsRepository.cs`
- Modify: `apps/api/Program.cs`
- Modify: `apps/api/Services/IAuthRepository.cs`
- Modify: `apps/api/Infrastructure/AuthRepository.cs`

- [ ] **Step 1: Add request contracts and service records**

Create minimal request DTOs and verification-code records.

- [ ] **Step 2: Add the repository contract**

Include methods for:
- reading the current CMS user
- checking email uniqueness
- reading an active verification code
- invalidating previous pending codes for an operation
- creating a verification code
- consuming a verification code
- updating the CMS user email
- updating the CMS user password hash

- [ ] **Step 3: Add the minimal `UserSettingsService`**

Implement:
- send email verification code
- change email
- change password

Validation requirements:
- current password hash must match the stored hash
- new email cannot be blank
- new password hash must be a 128-character hex string
- same-target code reuse works
- target changes invalidate older pending codes

- [ ] **Step 4: Extend auth token revocation**

Add a repository method to revoke all active tokens for a user, then call it from password change.

- [ ] **Step 5: Add the endpoint set**

Map:
- `POST /api/v1/users/me/email-verification-codes`
- `PUT /api/v1/users/me/email`
- `PUT /api/v1/users/me/password`

All routes require CMS auth metadata.

- [ ] **Step 6: Run focused backend tests to verify green**

Run:
- `dotnet test apps/api.tests --filter UserSettingsServiceTests`
- `dotnet test apps/api.tests --filter UserSettingsEndpointTests`

Expected: PASS

## Chunk 3: Remove implicit game lookup from migrated User CP

### Task 5: Add failing tests for the corrected user profile boundary

**Files:**
- Modify: existing user profile backend tests
- Modify: `apps/web/src/pages/UserControlPanel/index.test.tsx`

- [ ] **Step 1: Write backend failing coverage**

Cover:
- profile endpoint no longer depends on a matching game `users` row
- unavailable game-side values are represented as missing/unavailable rather than linked

- [ ] **Step 2: Write frontend failing coverage**

Cover:
- `-` is rendered for unavailable game-side values
- profile copy no longer implies implicit linking

- [ ] **Step 3: Run focused tests to verify red**

Run:
- `dotnet test apps/api.tests --filter UserProfile`
- `cd apps/web && npm run test -- src/pages/UserControlPanel/index.test.tsx`

Expected: FAIL because current code still implies a linked legacy account

### Task 6: Implement the corrected profile boundary

**Files:**
- Modify: `apps/api/Infrastructure/UserProfileRepository.cs`
- Modify: `apps/api/Endpoints/UserProfileEndpoints.cs`
- Modify: `apps/api/Services/UserProfileRecords.cs` if needed
- Modify: `apps/web/src/pages/UserControlPanel/index.tsx`
- Modify: `apps/web/src/pages/UserControlPanel/index.module.scss`

- [ ] **Step 1: Remove direct game lookup behavior**

Stop using username-based legacy game lookups as an implicit link source.

- [ ] **Step 2: Return unavailable game-side values for now**

Adjust the backend and UI so the control panel can render `-` consistently.

- [ ] **Step 3: Re-run focused tests to verify green**

Run:
- `dotnet test apps/api.tests --filter UserProfile`
- `cd apps/web && npm run test -- src/pages/UserControlPanel/index.test.tsx`

Expected: PASS

## Chunk 4: Frontend TDD for user settings

### Task 7: Add failing frontend service and page tests

**Files:**
- Modify: `apps/web/src/pages/UserControlPanel/index.service.test.ts`
- Modify: `apps/web/src/pages/UserControlPanel/index.test.tsx`

- [ ] **Step 1: Add failing service tests**

Cover:
- send email verification code hits `/users/me/email-verification-codes`
- change email hits `/users/me/email`
- change password hits `/users/me/password`

- [ ] **Step 2: Add failing page tests**

Cover:
- verification code preview auto-fills the code input
- successful email change updates the rendered email
- successful password change clears auth state and redirects to login

- [ ] **Step 3: Run focused frontend tests to verify red**

Run:
- `cd apps/web && npm run test -- src/pages/UserControlPanel/index.service.test.ts`
- `cd apps/web && npm run test -- src/pages/UserControlPanel/index.test.tsx`

Expected: FAIL because the current service and page do not implement the new forms

### Task 8: Implement the frontend user-settings flow

**Files:**
- Modify: `apps/web/src/pages/UserControlPanel/index.service.ts`
- Modify: `apps/web/src/pages/UserControlPanel/index.tsx`
- Modify: `apps/web/src/pages/UserControlPanel/index.module.scss`

- [ ] **Step 1: Add page-local service helpers**

Implement:
- send email verification code
- change email
- change password

Use explicit Promise chains only.

- [ ] **Step 2: Add the website settings UI**

Implement:
- current password + new email + verification code flow
- password change form
- auto-fill from `verificationCodePreview`
- loading and error states

- [ ] **Step 3: Clear local auth state after password changes**

On successful password change:
- clear token and current auth user
- redirect to `/login`

- [ ] **Step 4: Re-run focused frontend tests to verify green**

Run:
- `cd apps/web && npm run test -- src/pages/UserControlPanel/index.service.test.ts`
- `cd apps/web && npm run test -- src/pages/UserControlPanel/index.test.tsx`

Expected: PASS

## Chunk 5: Full verification

### Task 9: Run the full verification suite

**Files:**
- Verify: all files touched by this slice

- [ ] **Step 1: Run backend verification**

Run:
- `dotnet test apps/api.tests`
- `dotnet build apps/api`

Expected: PASS with `0 errors`

- [ ] **Step 2: Run frontend verification**

Run:
- `cd apps/web && npm run test`
- `cd apps/web && npm run lint`
- `cd apps/web && npm run build`

Expected: PASS

- [ ] **Step 3: Review the final diff**

Run: `git status --short`
Expected: only the intended user-settings and docs files plus the pre-existing unrelated file remain
