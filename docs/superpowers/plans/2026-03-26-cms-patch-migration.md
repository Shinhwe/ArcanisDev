# CMS Patch Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the legacy `patch.php` news system into the new `apps/api` + `apps/web` stack with public news APIs, a `/patch` React page, category-driven browsing, and sanitized iframe article rendering.

**Architecture:** The backend adds a dedicated `/api/v1/news/*` read resource backed by `categories` and `posts`, plus a server-side HTML sanitizer and iframe document builder so legacy TinyMCE content can render safely. The frontend adds a page-local service and a new `Patch` page at `/patch`, keeps route state in `category_id` and `post_id`, uses a bottom `IntersectionObserver` probe for loading more summaries, and renders article detail inside an isolated iframe.

**Tech Stack:** ASP.NET Core 10, MySqlConnector, HtmlAgilityPack, React 19, TypeScript, Vite, SCSS, react-router-dom, Vitest

---

## Chunk 1: Baseline And Backend News Resource

### Task 1: Reconfirm baseline and backend surface

**Files:**
- Verify: `AGENTS.md`
- Verify: `docs/superpowers/specs/2026-03-26-cms-patch-migration-design.md`
- Verify: `apps/api/Program.cs`
- Verify: `apps/api/Infrastructure/LegacyCmsConnectionFactory.cs`
- Verify: `apps/api/Endpoints/DownloadEndpoints.cs`
- Verify: `apps/web/src/app/router/index.tsx`
- Verify: `apps/web/src/components/AppShell/index.tsx`

- [ ] **Step 1: Record the current working tree**

Run: `git status --short`
Expected: only pre-existing unrelated files remain, such as `?? resources/sql/Awaken.psd`

- [ ] **Step 2: Reconfirm the approved design and user constraints**

Read:
- `docs/superpowers/specs/2026-03-26-cms-patch-migration-design.md`
- `AGENTS.md`

Expected:
- page route remains `/patch`
- only `apps/web` and `apps/api` will be modified
- likes remain out of scope
- old PHP pages remain untouched

- [ ] **Step 3: Reconfirm the current verification baseline**

Run:
- `dotnet test apps/api.tests`
- `dotnet build apps/api`
- `cd apps/web && npm run test`
- `cd apps/web && npm run lint`
- `cd apps/web && npm run build`

Expected: all commands pass before touching patch migration files

### Task 2: Add the backend contracts, records, and sanitizer dependency

**Files:**
- Modify: `apps/api/api.csproj`
- Create: `apps/api/Contracts/News/NewsCategoryResponse.cs`
- Create: `apps/api/Contracts/News/NewsCategoryListResponse.cs`
- Create: `apps/api/Contracts/News/NewsPostListItemResponse.cs`
- Create: `apps/api/Contracts/News/NewsPostListResponse.cs`
- Create: `apps/api/Contracts/News/NewsPostDetailResponse.cs`
- Create: `apps/api/Contracts/News/NewsPostResponse.cs`
- Create: `apps/api/Services/INewsRepository.cs`
- Create: `apps/api/Services/NewsRecords.cs`
- Create: `apps/api/Services/INewsHtmlDocumentBuilder.cs`

- [ ] **Step 1: Add the HTML parsing dependency**

Modify `apps/api/api.csproj` to add:

```xml
<PackageReference Include="HtmlAgilityPack" Version="1.12.1" />
```

- [ ] **Step 2: Add the API response contracts**

Create contract records for:
- categories list
- post list item
- post list response
- post detail response

Keep JSON shape aligned with the approved spec:
- `categories`
- `items`
- `nextCursor`
- `post`

- [ ] **Step 3: Add the repository and HTML builder interfaces**

Create:
- `INewsRepository`
- `INewsHtmlDocumentBuilder`
- news record types for:
  - categories
  - list items
  - cursor
  - paged list
  - detail record

- [ ] **Step 4: Verify the backend project still restores and compiles**

Run: `dotnet build apps/api`
Expected: restore succeeds and the project now compiles with the new contracts and interfaces in place

### Task 3: Implement the backend news repository, sanitizer, and endpoints

**Files:**
- Create: `apps/api/Infrastructure/NewsRepository.cs`
- Create: `apps/api/Services/NewsHtmlDocumentBuilder.cs`
- Create: `apps/api/Endpoints/NewsEndpoints.cs`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Implement `NewsRepository`**

Add methods to:
- read all categories ordered by `id ASC`
- read paged post summaries by category using keyset pagination
- read one post detail joined with its category

Implementation requirements:
- open a new MySQL connection inside each public method
- run `SET time_zone = '+00:00'` immediately after `OpenAsync`
- filter out rows where `posts.created_at IS NULL`
- use the strict DESC cursor predicate:
  - `created_at < cursorCreatedAtUtc`
  - or `created_at = cursorCreatedAtUtc AND id < cursorPostId`
- serialize cursor timestamps using `yyyy-MM-ddTHH:mm:ss.fffffffZ`

- [ ] **Step 2: Implement `NewsHtmlDocumentBuilder`**

Add server-side sanitization that:
- parses the raw HTML with `HtmlAgilityPack`
- strips forbidden tags and dangerous attributes
- allows the approved content tags
- keeps only the approved inline CSS properties
- normalizes URLs:
  - absolute `http` and `https`
  - site-root `/...`
  - legacy relative URLs normalized to a final site-root path
- removes all `data:` URLs
- emits a full iframe-ready HTML document string

- [ ] **Step 3: Implement `NewsEndpoints`**

Map:
- `GET /api/v1/news/categories`
- `GET /api/v1/news/posts`
- `GET /api/v1/news/posts/{postId}`

Behavior requirements:
- invalid `categoryId`, `pageSize`, or `cursor` return the existing API error JSON shape with `400`
- unknown but syntactically valid `categoryId` returns `200` with `items: []`
- missing post returns `404`
- all response timestamp and cursor fields are emitted as JSON strings, not date objects

- [ ] **Step 4: Register the repository, HTML builder, and endpoints**

Modify `apps/api/Program.cs` to:
- add `builder.Services.AddScoped<INewsRepository, NewsRepository>();`
- add `builder.Services.AddScoped<INewsHtmlDocumentBuilder, NewsHtmlDocumentBuilder>();`
- call `app.MapNewsEndpoints();`

- [ ] **Step 5: Verify the backend slice**

Run:
- `dotnet build apps/api`
- `dotnet test apps/api.tests`

Expected:
- `apps/api` builds successfully
- existing backend tests remain green as a regression check

## Chunk 2: Frontend TDD For Services, Routing, And Navigation

### Task 4: Add failing frontend tests for the patch service and route exposure

**Files:**
- Create: `apps/web/src/pages/Patch/index.service.test.ts`
- Modify: `apps/web/src/app/router/index.test.tsx`
- Modify: `apps/web/src/components/AppShell/index.test.tsx`

- [ ] **Step 1: Write the failing page-local service tests**

Create `apps/web/src/pages/Patch/index.service.test.ts` covering:
- `getNewsCategories()` requests `/api/v1/news/categories`
- `getNewsPosts()` requests `/api/v1/news/posts` with URL-encoded `cursor`
- `getNewsPostDetail()` requests `/api/v1/news/posts/{postId}`

Also assert:
- `createdAt` stays a string
- `nextCursor` stays a string or `null`

- [ ] **Step 2: Extend the router tests for the new `/patch` route**

Modify `apps/web/src/app/router/index.test.tsx` to assert:
- a lazy route exists at `patch`
- rendering `/patch` loads the Patch page heading

- [ ] **Step 3: Extend the shell navigation tests**

Modify `apps/web/src/components/AppShell/index.test.tsx` to assert:
- the public navigation exposes `Patch Notes`
- the patch link points to `/patch`
- existing public items remain available
- internal `Playground` remains hidden

- [ ] **Step 4: Run the focused frontend tests to verify red**

Run:
- `cd apps/web && npm run test -- src/pages/Patch/index.service.test.ts`
- `cd apps/web && npm run test -- src/app/router/index.test.tsx`
- `cd apps/web && npm run test -- src/components/AppShell/index.test.tsx`

Expected: FAIL because the Patch page module, route, and navigation entry do not exist yet

### Task 5: Implement the patch service, route, and shell navigation

**Files:**
- Create: `apps/web/src/pages/Patch/index.service.ts`
- Modify: `apps/web/src/app/router/index.tsx`
- Modify: `apps/web/src/components/AppShell/index.tsx`

- [ ] **Step 1: Implement the page-local service**

Create service functions for:
- categories
- paged post summaries
- post detail

Requirements:
- reuse `HttpClient`
- keep request ownership inside `index.service.ts`
- URL-encode `cursor` before sending it
- preserve string field types from the API response

- [ ] **Step 2: Add the lazy `/patch` route**

Modify the router to:
- lazy-load `../../pages/Patch`
- expose a route at `path: 'patch'`

- [ ] **Step 3: Add the public navigation item**

Modify `AppShell` navigation to expose:
- `Patch Notes` -> `/patch`

Do not expose:
- duplicate legacy `Events`
- internal routes

- [ ] **Step 4: Re-run the focused tests to verify green**

Run:
- `cd apps/web && npm run test -- src/pages/Patch/index.service.test.ts`
- `cd apps/web && npm run test -- src/app/router/index.test.tsx`
- `cd apps/web && npm run test -- src/components/AppShell/index.test.tsx`

Expected: PASS

## Chunk 3: Frontend TDD For The Patch Page Behavior

### Task 6: Add failing page tests for category flow, detail flow, and loading-more behavior

**Files:**
- Create: `apps/web/src/pages/Patch/index.test.tsx`
- Modify: `apps/web/src/test/setup.ts`

- [ ] **Step 1: Add test helpers for `IntersectionObserver`**

Modify `apps/web/src/test/setup.ts` to provide a controllable `IntersectionObserver` stub suitable for page tests.

- [ ] **Step 2: Write failing page tests for route-driven states**

Cover:
- missing `category_id` normalizes to the first category
- no `post_id` shows a detail empty state instead of auto-selecting the first post
- existing `post_id` loads detail first and normalizes `category_id` from the detail payload
- stale or invalid `post_id` shows a detail not-found panel while preserving the URL value

- [ ] **Step 3: Write failing page tests for list and detail rendering**

Cover:
- loading categories
- category empty state
- summary list rendering
- detail loading state
- detail unavailable state
- iframe `srcDoc` rendering for article detail

- [ ] **Step 4: Write failing page tests for loading more**

Cover:
- the bottom sentinel requests the next page when the observer fires
- `hasMoreData` stays `true` when `items.length === pageSize`
- `hasMoreData` becomes `false` when `items.length < pageSize`
- later-page failure preserves already-loaded posts and shows a retry affordance

- [ ] **Step 5: Run the focused page tests to verify red**

Run: `cd apps/web && npm run test -- src/pages/Patch/index.test.tsx`
Expected: FAIL because the page implementation does not exist yet

### Task 7: Implement the Patch page and styles

**Files:**
- Create: `apps/web/src/pages/Patch/index.tsx`
- Create: `apps/web/src/pages/Patch/index.module.scss`

- [ ] **Step 1: Build the route-driven page state**

Implement:
- query param parsing for `category_id` and `post_id`
- category-first initialization when no detail is present
- detail-first initialization when `post_id` is present
- detail empty state when no article is selected
- detail not-found state when `post_id` is invalid or missing on the server

- [ ] **Step 2: Build the summary list and load-more flow**

Implement:
- left-column category navigation
- summary list rendering
- `IntersectionObserver` bottom sentinel
- `hasMoreData` calculation strictly from `items.length === pageSize`
- retry UI for later-page failures

- [ ] **Step 3: Build the detail panel and iframe behavior**

Implement:
- detail metadata rendering
- iframe `srcDoc` rendering
- iframe sandbox as `allow-same-origin allow-popups`
- iframe height measurement after load
- remeasurement when embedded images change document height

- [ ] **Step 4: Add the responsive SCSS module**

Implement styling that:
- keeps the legacy patch/news composition recognizable
- preserves the migrated visual language already used by the new stack
- handles desktop and mobile layouts cleanly
- avoids Bootstrap JavaScript behavior

- [ ] **Step 5: Re-run the focused page tests to verify green**

Run: `cd apps/web && npm run test -- src/pages/Patch/index.test.tsx`
Expected: PASS

## Chunk 4: Full Verification

### Task 8: Run the full verification suite for the patch migration

**Files:**
- Verify: `apps/api`
- Verify: `apps/web`
- Verify: `docs/superpowers/specs/2026-03-26-cms-patch-migration-design.md`

- [ ] **Step 1: Run the backend regression checks**

Run:
- `dotnet test apps/api.tests`
- `dotnet build apps/api`

Expected: PASS

- [ ] **Step 2: Run the frontend verification checks**

Run:
- `cd apps/web && npm run test`
- `cd apps/web && npm run lint`
- `cd apps/web && npm run build`

Expected: PASS

- [ ] **Step 3: Reconfirm the final working tree**

Run: `git status --short`
Expected:
- only the intended `apps/web`, `apps/api`, and plan/spec files are modified
- unrelated `?? resources/sql/Awaken.psd` remains untouched

- [ ] **Step 4: Summarize any gaps before claiming completion**

Check:
- `/patch` is exposed in navigation
- `/api/v1/news/*` is mapped
- likes were not migrated
- old PHP pages were not modified
- article detail uses sanitized iframe output
