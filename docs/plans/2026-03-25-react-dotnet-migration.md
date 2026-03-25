# React + .NET Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Initialize a parallel migration workspace with an ASP.NET Core 10 API and a React + TypeScript + Vite frontend using SCSS and `esnext`.

**Architecture:** Keep the legacy PHP application in place and add a new stack under `apps/` for incremental migration. The API and web app remain independent during bootstrap so they can evolve without forcing immediate backend integration.

**Tech Stack:** .NET 10, ASP.NET Core Web API, React, TypeScript, Vite, SCSS

---

### Task 1: Create the repository layout and migration docs

**Files:**
- Create: `docs/plans/2026-03-25-react-dotnet-migration-design.md`
- Create: `docs/plans/2026-03-25-react-dotnet-migration.md`

**Step 1: Create the docs directory**

Run: `mkdir -p docs/plans`
Expected: directory exists with no error

**Step 2: Write the design document**

Document the migration scope, layout, defaults, and phased direction.

**Step 3: Write the implementation plan**

Document the scaffold tasks and verification commands for the bootstrap phase.

### Task 2: Initialize the backend API

**Files:**
- Create: `apps/api/*`

**Step 1: Scaffold the API**

Run: `dotnet new webapi -o apps/api --framework net10.0`
Expected: ASP.NET Core Web API project created successfully

**Step 2: Restore dependencies**

Run: `dotnet restore apps/api`
Expected: restore completes with exit code 0

**Step 3: Add minimal development CORS**

Modify `apps/api/Program.cs` to allow the future Vite dev server during development only.

**Step 4: Build the API**

Run: `dotnet build apps/api`
Expected: build succeeds with exit code 0

### Task 3: Initialize the frontend web app

**Files:**
- Create: `apps/web/*`

**Step 1: Scaffold the Vite app**

Run: `npm create vite@latest apps/web -- --template react-ts`
Expected: Vite React TypeScript project created successfully

**Step 2: Install dependencies**

Run: `npm install`
Working directory: `apps/web`
Expected: install completes with exit code 0

**Step 3: Switch styling to SCSS**

Replace the default CSS entry with SCSS and update imports accordingly.

**Step 4: Set Vite and TypeScript targets to `esnext`**

Update Vite build target and TypeScript compiler targets to `ESNext`.

**Step 5: Build the web app**

Run: `npm run build`
Working directory: `apps/web`
Expected: build succeeds with exit code 0

### Task 4: Verify the bootstrap result

**Files:**
- Verify: `apps/api`
- Verify: `apps/web`

**Step 1: Verify backend build**

Run: `dotnet build apps/api`
Expected: 0 errors

**Step 2: Verify frontend build**

Run: `npm run build`
Working directory: `apps/web`
Expected: production build completes successfully

**Step 3: Review generated structure**

Run: `find apps -maxdepth 2 -type f | sort`
Expected: both `apps/api` and `apps/web` contain standard bootstrap files
