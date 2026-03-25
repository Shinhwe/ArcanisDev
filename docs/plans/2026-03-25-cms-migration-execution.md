# CMS Migration Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Continue the migration from the legacy PHP CMS to the new `apps/api` + `apps/web` stack, starting from the current initialized baseline in the main repository.

**Architecture:** Keep the PHP site running while the new React frontend and ASP.NET Core API grow in parallel. Migrate in vertical slices: first stabilize the new frontend structure and API foundation, then move read-only public features, then authentication, then user/admin workflows.

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

**Step 1: Confirm clean git state**

Run: `git status --short`
Expected: no output

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

**Step 4: Re-run frontend verification**

Run:
- `cd apps/web && npm run test`
- `cd apps/web && npm run lint`
- `cd apps/web && npm run build`

Expected: all pass

**Step 5: Re-run backend verification**

Run: `dotnet build apps/api`
Expected: build succeeds; current NuGet cache warnings may still appear but there should be `0 errors`

### Task 2: Clean bootstrap residue and align the web app with repository conventions

**Files:**
- Delete: `apps/web/src/assets/hero.png`
- Delete: `apps/web/src/assets/react.svg`
- Delete: `apps/web/src/assets/vite.svg`
- Review: `apps/web/public/icons.svg`
- Review: `apps/web/public/favicon.svg`
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

### Task 3: Add a typed frontend API layer skeleton

**Files:**
- Create: `apps/web/src/services/http/index.ts`
- Create: `apps/web/src/services/http/index.test.ts`
- Create: `apps/web/src/services/config/index.ts`
- Create: `apps/web/src/services/config/index.service.ts`
- Create: `apps/web/src/services/rankings/index.ts`
- Create: `apps/web/src/services/rankings/index.service.ts`
- Modify: `apps/web/src/pages/Home/index.tsx`

**Step 1: Write the failing test for the HTTP layer**

Test that the HTTP helper builds URLs from a configured API base and returns parsed JSON.

**Step 2: Run the test to verify red**

Run: `cd apps/web && npm run test -- src/services/http/index.test.ts`
Expected: FAIL because the helper does not exist yet

**Step 3: Implement the minimal HTTP helper**

Add a small fetch wrapper that:
- reads the API base URL from env
- returns `Promise`s
- parses JSON
- throws on non-2xx responses

**Step 4: Add feature-level service placeholders**

Create `config` and `rankings` service folders using the repository’s `folder/index.*` convention. If they issue HTTP requests, put request code in `index.service.ts`.

**Step 5: Verify green**

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
- Create: `apps/api/Endpoints/RankingsEndpoints.cs`
- Create: `apps/api/Configuration/DatabaseOptions.cs`
- Modify: `apps/api/appsettings.json`
- Modify: `apps/api/appsettings.Development.json`

**Step 1: Write the failing backend test or verification target**

If test infrastructure is not added yet, define the next verifiable target as a successful build plus reachable minimal endpoints.

**Step 2: Move inline endpoints out of `Program.cs`**

Create explicit endpoint registration files so `Program.cs` becomes composition-only.

**Step 3: Add configuration objects**

Introduce strongly typed configuration for database and integration settings, even if no real DB call is implemented yet.

**Step 4: Add placeholder read-only endpoints**

Create minimal `config` and `rankings` endpoints with static or stubbed responses that match the shape the frontend will consume later.

**Step 5: Verify backend build**

Run: `dotnet build apps/api`
Expected: success with `0 errors`

### Task 5: Migrate the first real public read-only slice: site config

**Files:**
- Reference legacy: `sidefunc/web_general.php`
- Modify: `apps/api/Endpoints/ConfigEndpoints.cs`
- Modify: `apps/web/src/services/config/index.service.ts`
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

### Task 6: Migrate the second public read-only slice: rankings

**Files:**
- Reference legacy: `sidefunc/rank_info.php`
- Modify: `apps/api/Endpoints/RankingsEndpoints.cs`
- Modify: `apps/web/src/services/rankings/index.service.ts`
- Create: `apps/web/src/components/RankingList/index.tsx`
- Create: `apps/web/src/components/RankingList/index.module.scss`
- Modify: `apps/web/src/pages/Home/index.tsx`

**Step 1: Inspect legacy ranking behavior**

Document query params, response fields, pagination, and any legacy quirks from `sidefunc/rank_info.php`.

**Step 2: Write failing tests**

Add a service test for the rankings client and a UI test for rendering a basic ranking list.

**Step 3: Implement the minimal backend endpoint**

Return a stable response contract that supports page number and optional filters.

**Step 4: Implement the frontend list**

Render rankings on the Home page using a dedicated reusable component under `components/`.

**Step 5: Verify green**

Run:
- `cd apps/web && npm run test`
- `cd apps/web && npm run lint`
- `cd apps/web && npm run build`
- `dotnet build apps/api`

Expected: all pass

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
git add apps/web/src/services
git commit -m "feat: add frontend api service foundation"
```

**Step 3: Commit backend endpoint organization**

```bash
git add apps/api
git commit -m "refactor: organize api endpoint registration"
```

**Step 4: Commit each migrated public slice separately**

Use one commit per migrated feature so rollback stays cheap and review stays readable.
