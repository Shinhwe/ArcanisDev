# CMS Migration Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Continue the migration from the legacy PHP CMS to the new `apps/api` + `apps/web` stack, starting from the current initialized baseline in the main repository.

**Architecture:** Keep the PHP site running while the new React frontend and ASP.NET Core API grow in parallel. Execute this plan directly on top of the current repository state instead of re-bootstrapping the apps or introducing a new frontend service root. Reuse the existing shared transport layer in `apps/web/src/app/http`, keep request ownership inside the page or component that consumes it via `index.service.ts`, and expose backend capabilities through versioned RESTful API endpoints under `/api/v1`.

**Tech Stack:** ASP.NET Core 10, React 19, TypeScript, Vite, SCSS, react-router-dom, rxjs, Vitest

---

### Task 1: Re-establish repository baseline and confirm current app structure

**Files:**
- Verify: `AGENTS.md`
- Verify: `apps/api/*`
- Verify: `apps/web/*`
- Verify: `docs/plans/2026-03-25-react-dotnet-migration-design.md`
- Verify: `docs/plans/2026-03-25-react-dotnet-migration.md`
- Verify: `docs/plans/2026-03-25-web-tooling-foundation.md`

**Step 1: Record current git state**

Run: `git status --short`
Expected: capture the current working tree status before changes; do not discard unrelated user files just to force a clean state

**Step 2: Confirm latest bootstrap commit**

Run: `git log --oneline -1`
Expected: latest commit is `14605ec feat: initialize migration workspace` or a later follow-up commit

**Step 3: Re-read project constraints**

Read:
- `AGENTS.md`
- `apps/web/package.json`
- `apps/web/src/app/router/index.tsx`
- `apps/web/src/components/AppShell/index.tsx`
- `apps/api/Program.cs`

**Step 4: Ensure frontend dependencies exist**

Run: `cd apps/web && npm install`
Expected: local dependencies are installed so `test`, `lint`, and `build` commands are runnable

**Step 5: Re-run frontend verification**

Run:
- `cd apps/web && npm run test`
- `cd apps/web && npm run lint`
- `cd apps/web && npm run build`

Expected: all pass

**Step 6: Re-run backend verification**

Run: `dotnet build apps/api`
Expected: build succeeds; current NuGet cache warnings may still appear but there should be `0 errors`

### Task 2: Clean bootstrap residue and align the web app with repository conventions

**Files:**
- Delete: `apps/web/src/assets/hero.png`
- Delete: `apps/web/src/assets/react.svg`
- Delete: `apps/web/src/assets/vite.svg`
- Review: `apps/web/public/icons.svg`
- Review: `apps/web/public/favicon.svg`
- Modify: `apps/web/src/app/router/index.test.tsx`
- Modify: `apps/web/src/pages/Home/index.tsx`
- Modify: `apps/web/src/pages/Home/index.module.scss`
- Modify: `apps/web/src/pages/Playground/index.tsx`
- Modify: `apps/web/src/pages/Playground/index.module.scss`

**Step 1: Remove unused Vite template assets**

Delete the leftover template assets that are no longer imported anywhere.

**Step 2: Verify no imports still reference deleted files**

Run: `rg -n "hero\\.png|react\\.svg|vite\\.svg" apps/web/src apps/web/public`
Expected: no matches outside deleted files or intentional static assets

**Step 3: Tighten page copy and UI naming**

Reduce bootstrap/demo wording so the current pages read like real migration placeholders rather than template scaffolding.

**Step 4: Re-run frontend verification**

Run:
- `cd apps/web && npm run test`
- `cd apps/web && npm run lint`
- `cd apps/web && npm run build`

Expected: all pass

### Task 3: Add a typed page-local API skeleton on top of the existing HttpClient

**Files:**
- Verify: `apps/web/src/app/http/HttpClient/index.ts`
- Verify: `apps/web/src/app/http/HttpClient/index.test.ts`
- Verify: `apps/web/src/app/http/HttpClientError/index.ts`
- Create: `apps/web/src/pages/Home/index.service.ts`
- Create: `apps/web/src/pages/Home/index.service.test.ts`
- Modify: `apps/web/src/pages/Home/index.tsx`

**Step 1: Re-read the shared transport contract**

Read the existing `HttpClient` implementation and tests so the new service layer reuses the current transport behavior instead of duplicating it.

**Step 2: Write the failing test for the page-local service**

Test that the Home page service calls the site config resource through the shared `HttpClient`, returns typed JSON data, and keeps resource semantics out of the transport layer.

**Step 3: Run the test to verify red**

Run: `cd apps/web && npm run test -- src/pages/Home/index.service.test.ts`
Expected: FAIL because the page-local service module does not exist yet

**Step 4: Implement the minimal page-local service**

Create `apps/web/src/pages/Home/index.service.ts` and add the typed config request helper needed by the Home page. Use explicit Promise chains in the service file and keep resource paths inside this page-level module.

**Step 5: Keep the Home page aligned with the new service boundary**

If the page text or imports need to change so the new service boundary is obvious, update `apps/web/src/pages/Home/index.tsx` accordingly.

**Step 6: Verify green**

Run:
- `cd apps/web && npm run test`
- `cd apps/web && npm run lint`
- `cd apps/web && npm run build`

Expected: all pass

### Task 4: Prepare backend configuration and endpoint organization

**Files:**
- Modify: `apps/api/Program.cs`
- Create: `apps/api/Endpoints/HealthEndpoints.cs`
- Create: `apps/api/Endpoints/ConfigEndpoints.cs`
- Create: `apps/api/Configuration/DatabaseOptions.cs`
- Modify: `apps/api/appsettings.json`
- Modify: `apps/api/appsettings.Development.json`

**Step 1: Write the failing backend test or verification target**

If test infrastructure is not added yet, define the next verifiable target as a successful build plus reachable minimal endpoints.

**Step 2: Move inline endpoints out of `Program.cs`**

Create explicit endpoint registration files so `Program.cs` becomes composition-only.

**Step 3: Add configuration objects**

Introduce strongly typed configuration for database and integration settings, even if no real DB call is implemented yet.

**Step 4: Add the site config endpoint**

Create a minimal RESTful `config` endpoint that matches the shape the frontend will consume later. Keep routes versioned under `/api/v1`.

**Step 5: Verify backend build**

Run: `dotnet build apps/api`
Expected: success with `0 errors`

### Task 5: Migrate the first real public read-only slice: site config

**Files:**
- Reference legacy: `sidefunc/web_general.php`
- Modify: `apps/api/Endpoints/ConfigEndpoints.cs`
- Modify: `apps/web/src/pages/Home/index.service.ts`
- Modify: `apps/web/src/pages/Home/index.tsx`

**Step 1: Inspect legacy behavior**

Read `sidefunc/web_general.php` and note the response shape and fields currently used by the PHP site.

**Step 2: Write the failing frontend test**

Add a small page-level or service-level test proving the config service returns the expected normalized fields.

**Step 3: Implement the backend endpoint**

Replace the stub with a real implementation or an interim adapter, depending on whether direct DB access is ready.

**Step 4: Implement the frontend consumer**

Fetch the config data in the Home page and render at least one real value from the API.

**Step 5: Verify full stack locally**

Run:
- `dotnet build apps/api`
- `cd apps/web && npm run test`
- `cd apps/web && npm run lint`
- `cd apps/web && npm run build`

Expected: all pass

### Task 6: Rankings migration deferred

The legacy rankings flow under `sidefunc/rank_info.php` and the old jQuery-driven homepage block are intentionally out of scope for the current batch.

### Task 7: Prepare the authentication migration slice

**Files:**
- Reference legacy: `process_login.php`
- Reference legacy: `process_register.php`
- Reference legacy: `sidefunc/reset_password.php`
- Reference legacy: `user-cp.php`
- Create: `docs/plans/2026-03-25-auth-migration-notes.md`

**Step 1: Audit the legacy auth behavior**

Capture current request flows, session behavior, and password inconsistencies in a notes document.

**Step 2: Document the target auth model**

Decide between cookie-based auth and token-based auth for the new stack. Record the decision and why.

**Step 3: Identify blocking migration risks**

Specifically call out:
- plaintext password handling in legacy code
- registration/login mismatch
- reset-password behavior
- session assumptions in user/admin pages

**Step 4: Stop before implementation**

Do not build auth in the same session as the public read-only migration unless the design is confirmed.

### Task 8: Commit in small verified slices

**Files:**
- Modify: the files touched by each vertical slice only

**Step 1: Commit bootstrap cleanup**

```bash
git add apps/web
git commit -m "refactor: align web app structure with project conventions"
```

**Step 2: Commit API layer skeleton**

```bash
git add apps/web/src/pages/Home apps/web/src/app/http
git commit -m "feat: add home page api service foundation"
```

**Step 3: Commit backend endpoint organization**

```bash
git add apps/api
git commit -m "refactor: organize api endpoint registration"
```

**Step 4: Commit each migrated public slice separately**

Use one commit per migrated feature so rollback stays cheap and review stays readable.
