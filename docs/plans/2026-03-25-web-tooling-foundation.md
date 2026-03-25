# Web Tooling Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add foundational frontend tooling for routing and future data work by introducing `react-router-dom`, `rxjs`, `normalize.css`, and a minimal test setup.

**Architecture:** Keep the routing layer thin and centralized under `src/app`, with lightweight pages under `src/pages`. `rxjs` is introduced as a dependency only, without wiring an observable-based data flow yet, so later API work can adopt it incrementally.

**Tech Stack:** React 19, TypeScript, Vite, SCSS, react-router-dom, rxjs, normalize.css, Vitest, Testing Library, jsdom

---

### Task 1: Add package dependencies and test baseline

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/vite.config.ts`
- Create: `apps/web/src/test/setup.ts`

**Step 1: Install runtime dependencies**

Run: `npm install react-router-dom rxjs normalize.css`
Expected: install completes with exit code 0

**Step 2: Install test dependencies**

Run: `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom`
Expected: install completes with exit code 0

**Step 3: Add scripts and Vitest config**

Add `test` script and Vitest configuration for `jsdom` and test setup.

### Task 2: Write the failing routing tests

**Files:**
- Create: `apps/web/src/app/router.test.tsx`

**Step 1: Write a home route test**

Assert the root route renders the migration workspace content.

**Step 2: Write a playground route test**

Assert the playground route renders distinct page content.

**Step 3: Run test to verify it fails**

Run: `npm run test -- src/app/router.test.tsx`
Expected: FAIL because the router modules do not exist yet

### Task 3: Implement the minimal router structure

**Files:**
- Create: `apps/web/src/app/AppShell.tsx`
- Create: `apps/web/src/app/router.tsx`
- Create: `apps/web/src/app/AppShell.scss`
- Create: `apps/web/src/pages/HomePage.tsx`
- Create: `apps/web/src/pages/PlaygroundPage.tsx`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/styles/index.scss`

**Step 1: Add `BrowserRouter` integration**

Render the app through a router provider instead of a direct `App` component mount.

**Step 2: Centralize route definitions**

Expose a router factory that production can use with `BrowserRouter` and tests can use with a memory router.

**Step 3: Add two minimal pages**

Support `/` and `/playground` with an app shell and navigation.

**Step 4: Import `normalize.css`**

Load normalize before local SCSS so the app starts from a consistent baseline.

### Task 4: Verify green

**Files:**
- Verify: `apps/web`

**Step 1: Run the targeted test**

Run: `npm run test -- src/app/router.test.tsx`
Expected: PASS

**Step 2: Run the full frontend build**

Run: `npm run build`
Working directory: `apps/web`
Expected: PASS

**Step 3: Run lint**

Run: `npm run lint`
Working directory: `apps/web`
Expected: PASS
