# CMS Vote Migration Design

**Date:** 2026-03-26

## Goal

Migrate the legacy `Vote.php` page into the new `apps/web` + `apps/api` stack as a style-first CMS slice with a read-only vote eligibility resource.

This migration keeps the legacy PHP page untouched while exposing a new React route and a minimal RESTful API endpoint that reports the current placeholder voting eligibility state.

## Scope

This slice covers:

- a new public React page at `/vote`
- a new public API endpoint at `GET /api/v1/votes/eligibility`
- default navigation exposure for `Vote` in the new frontend shell
- visual migration of the old vote page layout
- placeholder vote eligibility states for anonymous and authenticated website users
- explicit `TODO` markers for the future linked-account and vote-submission flow

This slice does not cover:

- any change to legacy PHP pages
- GTOP100 integration
- the legacy `sidefunc/vote_handler.php` flow
- the legacy `gtop/pingback.php` reward flow
- forum migration
- rankings migration
- Bootstrap JavaScript
- jQuery
- Redis integration
- game-server reward delivery
- link-table rollout or account-linking UI

## Constraints

- Only modify `apps/web` and `apps/api`
- Follow `/Users/shinhwe/ArcanisDev/AGENTS.md`
- Continue reusing `apps/web/src/app/http/HttpClient`
- Keep request ownership inside the consuming page via `index.service.ts`
- Use RESTful API naming under `/api/v1`
- Do not expose unmigrated or internal modules in the new frontend navigation
- Bootstrap styles may be reused, but Bootstrap JS is forbidden
- Any jQuery behavior must be replaced by React or native browser behavior
- The current phase is style-first, but it must preserve the future product direction:
  - voting is allowed only after a website account is linked to a game account
  - a successful vote will eventually enqueue a Redis message
  - the game server will eventually consume that Redis queue and grant rewards

## Legacy Audit Summary

### `Vote.php`

- The page is a simple two-column layout with static instructions, a `Vote Now` button, and a vote image.
- The legacy mobile navigation depends on Bootstrap offcanvas behavior, which must not be migrated as-is.
- The visible action currently links to `sidefunc/vote_handler.php`.

### `sidefunc/vote_handler.php`

- The handler requires the legacy PHP website session.
- It checks a vote log table by IP and then redirects the user to GTOP100.
- This flow is intentionally not migrated.

### `gtop/pingback.php`

- The legacy reward path looks up a game account directly, updates vote-related tables, and logs the IP-based attempt.
- This is incompatible with the current product decision because the new CMS identity source is `cms_users / cms_auth_tokens`, and game-account linking has not shipped yet.

## Chosen Approach

Use a dedicated eligibility endpoint and a style-first frontend page, while deferring real vote submission.

### Why this approach

- It preserves the user-facing migration momentum by shipping the new page and navigation now.
- It avoids inventing a fake submission backend before account linking exists.
- It gives the frontend a stable eligibility contract that can later evolve into the real voting flow.
- It keeps the current scope aligned with the instruction to migrate style first.

### Rejected alternatives

1. Pure frontend-only page with no API
   - fastest path
   - weaker future boundary because the page would later need to be rewritten around eligibility state
2. Full `POST /api/v1/votes` implementation now
   - closer to the final architecture
   - premature because linked-account data and Redis delivery are both unavailable
3. Reuse the old GTOP100 redirect flow from the new frontend
   - smallest behavioral change
   - directly conflicts with the new product decision and would preserve unwanted legacy coupling

## API Design

### Route

`GET /api/v1/votes/eligibility`

### Authentication model

- This route is public and does not require `RequireCmsAuthAttribute`.
- If a valid CMS bearer token is present, the endpoint may use the request auth context.
- If no valid token is present, the endpoint still returns a valid eligibility payload instead of `401`.

### Response shape

```json
{
  "canVote": false,
  "status": "login_required",
  "message": "Login is required before voting.",
  "hasLinkedGameAccount": false,
  "voteIntervalHours": 24,
  "nextEligibleAt": null
}
```

### Response fields

- `canVote`
  - boolean capability flag for the page CTA
- `status`
  - future-proof enum-like string
  - planned values:
    - `login_required`
    - `link_required`
    - `cooldown`
    - `eligible`
- `message`
  - server-provided status copy for the frontend to display
- `hasLinkedGameAccount`
  - current placeholder linked-account signal
- `voteIntervalHours`
  - fixed `24` for this migration
- `nextEligibleAt`
  - nullable timestamp for the future cooldown state

### Current placeholder behavior

- Anonymous request:
  - `canVote = false`
  - `status = "login_required"`
  - `message = "Login is required before voting."`
  - `hasLinkedGameAccount = false`
  - `voteIntervalHours = 24`
  - `nextEligibleAt = null`
- Authenticated request:
  - `canVote = false`
  - `status = "link_required"`
  - `message = "Link a game account before voting."`
  - `hasLinkedGameAccount = false`
  - `voteIntervalHours = 24`
  - `nextEligibleAt = null`

### Future behavior reserved by contract

- `cooldown`
  - returned after real voting is added and the user must wait before voting again
- `eligible`
  - returned after real account linking exists and the user is currently allowed to vote

## Backend Design

### Files

- Create: `apps/api/Contracts/Votes/VoteEligibilityResponse.cs`
- Create: `apps/api/Services/VoteEligibilityRecords.cs`
- Create: `apps/api/Services/VoteEligibilityService.cs`
- Create: `apps/api/Endpoints/VoteEndpoints.cs`
- Modify: `apps/api/Program.cs`

### Responsibilities

- `VoteEndpoints.cs`
  - expose the public eligibility route
  - convert service records into API contracts
- `VoteEligibilityRecords.cs`
  - hold the internal state record for eligibility decisions
- `VoteEligibilityService.cs`
  - read the optional `CmsAuthContext`
  - produce the placeholder anonymous or authenticated eligibility result
  - preserve future `TODO` markers for link checks, cooldown checks, vote submission, and Redis queuing
- `Program.cs`
  - register the service
  - map the new endpoint set

### Service boundary

This slice uses a service rather than a repository because the current placeholder logic depends only on the optional auth context and not on database reads. A repository can be introduced later when linked-account data and cooldown records exist.

### Required future `TODO` markers

The backend implementation should explicitly mark:

- `TODO`: Replace the placeholder authenticated result with a real linked-account lookup
- `TODO`: Add 24-hour cooldown evaluation when real vote records exist
- `TODO`: Add `POST /api/v1/votes` for vote submission after the CTA is enabled
- `TODO`: Enqueue successful vote events to Redis for game-server consumption

## Frontend Design

### Route

Add `/vote` to the new router and expose it in the public navigation by default.

### Files

- Create: `apps/web/src/pages/Vote/index.tsx`
- Create: `apps/web/src/pages/Vote/index.module.scss`
- Create: `apps/web/src/pages/Vote/index.service.ts`
- Create: `apps/web/src/pages/Vote/index.service.test.ts`
- Create: `apps/web/src/pages/Vote/index.test.tsx`
- Modify: `apps/web/src/app/router/index.tsx`
- Modify: `apps/web/src/components/AppShell/index.tsx`

### Page structure

The new page keeps the old vote page composition:

- heading area with `Vote for Awaken`
- left column for `How to Vote`
- right column for the primary vote action and vote artwork

### Page data flow

- The page fetches `GET /api/v1/votes/eligibility` through its page-local service.
- The page renders a loading state while the request is in flight.
- The page renders a disabled action area for all current states because `canVote` is always false in this slice.

### Page states

- loading
  - show a lightweight loading message in the action area
- `login_required`
  - show the login-required status message
  - keep the vote button disabled
- `link_required`
  - show the link-required status message
  - keep the vote button disabled
- request failure
  - show an unavailable message
  - keep the vote button disabled

### Current CTA behavior

- The page keeps a visible `Vote Now` button to preserve the migrated layout.
- The button is disabled in every currently reachable state.
- The click submission flow is not implemented in this slice.

### Required future `TODO` markers

The frontend implementation should explicitly mark:

- `TODO`: Enable the button only when the eligibility endpoint returns `eligible`
- `TODO`: Submit `POST /api/v1/votes` when voting becomes available
- `TODO`: Handle post-submit success feedback once Redis-backed vote submission exists

## Visual Design

- Reuse the existing migrated legacy asset slice already present in `apps/web/src/assets/legacy`
- Preserve the old vote page hierarchy and artwork emphasis
- Do not migrate legacy Bootstrap offcanvas behavior
- Keep the page consistent with the current `AppShell` visual language
- Keep the layout responsive for desktop and mobile
- Preserve the “How to Vote” instructional area, but update the cadence rule to `24` hours

## Testing Strategy

### Backend

Add endpoint tests under `apps/api.tests/Votes/` using the existing `AuthApiFactory` pattern.

Cover:

- anonymous request returns `200` with `login_required`
- authenticated request returns `200` with `link_required`
- both responses return `canVote = false`
- both responses return `voteIntervalHours = 24`

This slice does not require a new repository test double because the placeholder logic only depends on the auth context.

### Frontend

Write tests first for:

- the page-local service requesting `/api/v1/votes/eligibility` through `HttpClient`
- the vote page rendering loading, `login_required`, `link_required`, and unavailable states
- the vote button remaining disabled
- the app shell exposing a `Vote` navigation item
- the router resolving `/vote`

## Out of Scope Follow-ups

These may be addressed later, but not in this slice:

- link-table rollout
- linked game-account management UI
- vote submission endpoint
- Redis queue publishing
- game-server reward consumption
- cooldown persistence and timestamps
- migration of any admin vote-log tooling

## Implementation Readiness

This design is ready for a TDD implementation plan.

The current slice intentionally migrates only the page, the route, the navigation entry, and a minimal eligibility contract. It does not attempt to simulate a successful vote submission before the linked-account and Redis-backed flow exists.
