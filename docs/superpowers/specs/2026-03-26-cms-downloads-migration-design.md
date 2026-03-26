# CMS Downloads Migration Design

**Date:** 2026-03-26

## Goal

Migrate the legacy `Downloads.php` page into the new `apps/web` + `apps/api` stack as a safe public read-only CMS slice.

This migration keeps the legacy PHP page untouched while exposing a new React route and a RESTful API endpoint backed by the existing `web_general` table.

## Scope

This slice covers:

- a new public React page at `/downloads`
- a new public API endpoint at `GET /api/v1/downloads/client`
- real mirror data from `web_general.mega_mirror` and `web_general.drive_mirror`
- navigation exposure in the new frontend shell
- visual migration of the old downloads layout using the existing legacy asset slice already copied into `apps/web`

This slice does not cover:

- any change to legacy PHP pages
- forum migration
- rankings migration
- admin control panel migration
- user account mutation flows
- Bootstrap JavaScript
- jQuery
- database schema changes

## Constraints

- Only modify `apps/web` and `apps/api`
- Follow `/Users/shinhwe/ArcanisDev/AGENTS.md`
- Continue reusing `apps/web/src/app/http/HttpClient`
- Keep request ownership inside the consuming page via `index.service.ts`
- Use RESTful API naming under `/api/v1`
- Do not expose unmigrated or internal modules in the new frontend navigation
- Bootstrap styles may be reused, but Bootstrap JS is forbidden
- Any jQuery behavior must be replaced by React or native browser behavior

## Chosen Approach

Use a dedicated downloads resource instead of expanding the existing `/api/v1/config` endpoint.

### Why this approach

- It preserves resource boundaries between homepage config and download resources
- It keeps the downloads page independent from unrelated homepage fields
- It makes later expansion easier if more mirrors or download assets are added

### Rejected alternatives

1. Extend `/api/v1/config`
   - smaller short-term diff
   - worse long-term resource boundary
2. Hardcode all links in the frontend
   - fastest
   - breaks the real data migration goal

## API Design

### Route

`GET /api/v1/downloads/client`

### Response shape

```json
{
  "mirrors": [
    {
      "id": "mega",
      "label": "Mirror 1 (Mega)",
      "url": "https://example.com"
    },
    {
      "id": "google-drive",
      "label": "Mirror 2 (Google Drive)",
      "url": "https://example.com"
    }
  ]
}
```

### Data source

Read the first `web_general` row from the game database and map:

- `mega_mirror` -> mirror id `mega`
- `drive_mirror` -> mirror id `google-drive`

### Error handling

- If `web_general` has no row, return `404`
- If one mirror field is blank, omit that mirror from the response
- If both mirror fields are blank, return `200` with an empty `mirrors` array

## Backend Design

### Files

- Create: `apps/api/Endpoints/DownloadEndpoints.cs`
- Create: `apps/api/Contracts/Downloads/ClientDownloadResponse.cs`
- Create: `apps/api/Contracts/Downloads/DownloadMirrorResponse.cs`
- Create: `apps/api/Services/IDownloadRepository.cs`
- Create: `apps/api/Services/DownloadRecords.cs`
- Create: `apps/api/Infrastructure/DownloadRepository.cs`
- Modify: `apps/api/Program.cs`

### Responsibilities

- `DownloadEndpoints.cs`
  - expose the public route
  - map repository records into API contracts
- `IDownloadRepository.cs`
  - define the read contract for the downloads resource
- `DownloadRepository.cs`
  - query `web_general`
  - normalize null and blank values
- `Program.cs`
  - register the repository
  - map the endpoint set

### Repository boundary

This slice uses a repository instead of inline SQL inside the endpoint so backend endpoint tests can follow the repository-replacement pattern already used by auth and user profile tests.

## Frontend Design

### Route

Add `/downloads` to the new router and expose it in the public navigation.

### Files

- Create: `apps/web/src/pages/Downloads/index.tsx`
- Create: `apps/web/src/pages/Downloads/index.module.scss`
- Create: `apps/web/src/pages/Downloads/index.service.ts`
- Create: `apps/web/src/pages/Downloads/index.service.test.ts`
- Create: `apps/web/src/pages/Downloads/index.test.tsx`
- Modify: `apps/web/src/app/router/index.tsx`
- Modify: `apps/web/src/components/AppShell/index.tsx`
- Modify tests that assert visible shell navigation if needed

### Page structure

The new page keeps the old two-column layout:

- left column: installation guide steps
- right column: download artwork and mirror cards

### Data boundary

- Download mirrors come from `GET /api/v1/downloads/client`
- The legacy direct client package link is currently hardcoded in `Downloads.php`
- This migration keeps that direct client link as a page-local constant in the React page
- No database change is required in this slice

### Frontend states

- loading: show a lightweight loading message in the mirror area
- success with mirrors: render returned cards
- success with empty list: render a no-mirrors message
- not found or request failure: render an unavailable message while keeping the rest of the page usable

## Visual Design

- Reuse the existing migrated legacy assets from `apps/web/src/assets/legacy`
- Preserve the established visual language already used by `Home`, `Login`, `Register`, and `UserControlPanel`
- Do not reintroduce legacy offcanvas behavior or Bootstrap modal behavior
- Keep the page responsive for desktop and mobile inside the current `AppShell`

## Testing Strategy

### Backend

Add endpoint tests under `apps/api.tests/Downloads/` using the existing `AuthApiFactory` integration pattern.

Cover:

- two mirrors are returned when both URLs exist
- blank mirror URLs are filtered out
- empty mirror list still returns `200`
- missing data source row returns `404`

Use a new in-memory repository test double:

- `apps/api.tests/Downloads/TestDoubles/InMemoryDownloadRepository.cs`

### Frontend

Write tests first for:

- the page-local service requesting `/api/v1/downloads/client` through `HttpClient`
- the downloads page rendering loading, success, empty, and unavailable states
- the app shell exposing a `Downloads` navigation item

## Out of Scope Follow-ups

These may be addressed later, but not in this slice:

- moving the direct client package URL into database-backed config
- supporting additional download providers
- tracking file versions or checksums
- merging downloads data into a broader CMS content model

## Implementation Readiness

This design is ready for a TDD implementation plan. No database migration is required for the current scope. If the direct client package link is later moved into MySQL, the SQL file must be added under `resources/sql`.
