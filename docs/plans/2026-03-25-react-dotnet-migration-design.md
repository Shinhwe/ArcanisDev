# React + .NET Migration Design

**Date:** 2026-03-25

## Goal

Create a new parallel application stack inside this repository for a gradual migration away from the existing PHP CMS:

- `apps/api`: ASP.NET Core 10 backend
- `apps/web`: React + TypeScript + Vite frontend

The existing PHP site remains untouched during this phase.

## Scope

This first phase only establishes the new project skeleton and development defaults:

- new folder layout
- backend API scaffold
- frontend scaffold
- SCSS as the styling default
- Vite configured to target `esnext`

Out of scope for this phase:

- database integration
- business migration
- auth migration
- forum integration
- browser compatibility work

## Structure

Repository layout after this phase:

```text
apps/
  api/
  web/
docs/
  plans/
```

The new stack is intentionally isolated from the legacy PHP code so migration can proceed module by module.

## Backend Design

Use ASP.NET Core 10 Web API as a standalone service in `apps/api`.

Initial requirements:

- standard Web API scaffold
- HTTPS-enabled local development profile
- room for future feature slices such as `Modules`, `Contracts`, `Infrastructure`
- permissive development CORS to allow the Vite dev server to call the API

No database or authentication code will be added in this phase.

## Frontend Design

Use React + TypeScript + Vite in `apps/web`.

Initial requirements:

- TypeScript-first setup
- SCSS entrypoint instead of plain CSS
- Vite build target set to `esnext`
- minimal app shell suitable for later route/module migration
- no browser compatibility fallbacks or polyfill work

## Migration Direction

After scaffold creation, migration should proceed in this order:

1. Read-only public APIs
2. Home page and public React screens
3. Authentication
4. User control panel
5. Admin control panel

`community/` remains separate until the main CMS migration is stable.
