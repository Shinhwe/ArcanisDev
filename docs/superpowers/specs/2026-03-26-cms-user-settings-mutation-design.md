# CMS User Settings Mutation Design

**Date:** 2026-03-26

## Goal

Add the first writable user settings slice to the migrated `apps/web` + `apps/api` stack so authenticated CMS users can:

- change email
- change password

This slice also corrects the current `User Control Panel` boundary so website identity stops reading game account data directly from the game database.

## Scope

This slice covers:

- protected REST endpoints for change-email and change-password flows
- a reusable verification-code table under `resources/sql`
- a two-step email change flow inside the migrated `User Control Panel`
- a password change flow inside the migrated `User Control Panel`
- revoking all existing auth tokens after password changes
- removing the current implicit game-account lookup from the migrated `User Control Panel`
- showing `-` for unavailable game-side data until an explicit linking system exists

This slice does not cover:

- legacy PHP page changes
- forum migration
- rankings migration
- admin control panel migration
- forgotten password flows
- game-account linking UI
- game internal API integration
- real outbound email delivery

## Constraints

- Only modify `apps/web` and `apps/api`
- Follow `/Users/shinhwe/ArcanisDev/AGENTS.md`
- Keep `cms_users` as the website system’s canonical identity source
- Do not directly read game account data from the game database for website identity decisions
- Continue reusing `apps/web/src/app/http/HttpClient`
- Keep page-owned requests inside `index.service.ts`
- Use RESTful route naming under `/api/v1`
- Keep Bootstrap usage CSS-only; no Bootstrap JS
- Do not use jQuery

## Identity Boundary

The website system owns its own identity model:

- `cms_users`
- `cms_auth_tokens`

Website email and password mutation only update website data. They do not write to game-side account tables, do not synchronize with game credentials, and do not depend on a game database schema.

The migrated `User Control Panel` currently mixes website identity and game account data by implicitly reading the legacy game `users` table by username. That behavior must be removed in this slice.

Game-side account data becomes explicitly unavailable until a future linking flow exists. In the migrated UI, unavailable game values render as `-`.

## Email Change Flow

### API Routes

- `POST /api/v1/users/me/email-verification-codes`
- `PUT /api/v1/users/me/email`

### Step 1: Send verification code

Request:

```json
{
  "currentPasswordHash": "<current client-side hash>",
  "newEmail": "new@example.com"
}
```

Behavior:

- require authenticated user
- validate current password against `cms_users.password_hash`
- validate `newEmail`
- reject duplicate target email
- create or reuse a verification code record bound to:
  - current user
  - operation `change_email`
  - target email
- if an unexpired unused code already exists for the same user and same target email, return the existing code
- if the target email changes, invalidate any prior pending code for `change_email`
- leave a `TODO` at the email-delivery integration point
- for this temporary phase, return the verification code in the response

Response:

```json
{
  "message": "Verification code generated.",
  "verificationCodePreview": "123456"
}
```

### Step 2: Confirm email change

Request:

```json
{
  "currentPasswordHash": "<current client-side hash>",
  "newEmail": "new@example.com",
  "verificationCode": "123456"
}
```

Behavior:

- require authenticated user
- validate current password again
- validate `newEmail`
- find a verification code record for:
  - current user
  - operation `change_email`
  - target email = `newEmail`
- reject missing, expired, consumed, or invalidated codes
- reject code mismatch
- update `cms_users.email`
- mark the matched verification code as consumed
- keep current auth tokens active

## Password Change Flow

### API Route

- `PUT /api/v1/users/me/password`

Request:

```json
{
  "currentPasswordHash": "<current client-side hash>",
  "newPasswordHash": "<new client-side hash>"
}
```

Behavior:

- require authenticated user
- validate current password against `cms_users.password_hash`
- validate the new password hash format
- update `cms_users.password_hash`
- revoke all active rows in `cms_auth_tokens` for the user

Response:

- `204 No Content`

Frontend behavior after success:

- clear local auth state
- redirect to `/login`

## Verification Code Storage

Add a reusable verification-code table under `resources/sql`.

Suggested filename:

- `resources/sql/cms_user_verification_codes.sql`

### Table purpose

Store short-lived verification codes bound to:

- a CMS user
- a specific operation
- a specific target value

This allows future operations beyond email changes to reuse the same pattern.

### Proposed fields

- `id`
- `user_id`
- `operation`
- `target_value`
- `verification_code`
- `created_at`
- `expires_at`
- `consumed_at`
- `invalidated_at`

### Rules

- `verification_code` is stored as plaintext by explicit product choice
- current code format is a 6-digit numeric string
- email change uses `operation = "change_email"`
- `target_value` stores the requested new email
- only one active pending record should exist per user + operation; changing target invalidates the previous pending code
- if a matching active pending code already exists for the same user + operation + target, reuse it

## User Control Panel UI

Keep the current `/user-cp` route and add a new website-settings area inside it.

### Sections

- `Profile`
- `Account Summary`
- `Website Settings`

### Website Settings cards

- `Change Email`
- `Change Password`

### Change Email behavior

- user enters current password and new email
- user clicks send verification code
- if the API response includes `verificationCodePreview`, the page auto-fills the verification-code input
- user confirms the change with the verification code

### Change Password behavior

- user enters current password, new password, confirm new password
- on success, local auth state is cleared and the page redirects to `/login`

### Game data rendering

Until the future linking system exists:

- no implicit username-based game lookup
- all unavailable game-side values render as `-`
- the UI should describe the state as unavailable/unlinked rather than zero

## Backend Design

### Files

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
- Modify: `apps/api/Endpoints/UserProfileEndpoints.cs`
- Modify: `apps/api/Infrastructure/UserProfileRepository.cs`

### Responsibilities

- `UserSettingsEndpoints`
  - expose protected routes
  - map service results to HTTP responses
- `UserSettingsService`
  - validate requests
  - coordinate verification-code and mutation flows
- `UserSettingsRepository`
  - query and mutate `cms_users`
  - query and mutate verification-code records
- `AuthRepository`
  - revoke all active tokens for a specific user
- `UserProfileEndpoints` / `UserProfileRepository`
  - stop using the game DB as an implicit linked-account source

## Frontend Design

### Files

- Modify: `apps/web/src/pages/UserControlPanel/index.tsx`
- Modify: `apps/web/src/pages/UserControlPanel/index.module.scss`
- Modify: `apps/web/src/pages/UserControlPanel/index.service.ts`
- Modify tests under `apps/web/src/pages/UserControlPanel/`

### Service ownership

All user-settings HTTP requests stay inside:

- `apps/web/src/pages/UserControlPanel/index.service.ts`

### Requests

- send email verification code
- confirm email change
- confirm password change

All service functions follow the repository convention:

- page-local `index.service.ts`
- explicit Promise chaining
- no `await`

## Error Handling

### Auth failures

- missing or invalid auth token: `401`

### Email flow failures

- invalid current password: `400`
- duplicate target email: `409`
- invalid verification code: `400`
- expired or consumed verification code: `400`

### Password flow failures

- invalid current password: `400`
- invalid new password hash payload: `400`

Errors continue using the existing API error structure with optional `fieldErrors`.

## Testing Strategy

### Backend

Add tests for:

- generating a verification code
- reusing an unexpired code for the same target email
- invalidating the previous code when the target email changes
- changing email with a valid code
- rejecting email change for invalid, expired, or consumed codes
- changing password and revoking all active tokens for the user
- returning unavailable game data as `-`-compatible values for the current profile response

### Frontend

Add tests for:

- sending an email verification code
- auto-filling the verification-code input when `verificationCodePreview` is returned
- confirming an email change
- changing password and redirecting to login after local session clear
- rendering `-` for unavailable game-side values in the user control panel

## Out of Scope Follow-ups

- game-account linking page
- game internal API calls for account linking
- global Redis event delivery for registration sync
- replacing verification-code preview with real email delivery
- forgotten-password recovery
