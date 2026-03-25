# Web Route Lazy Loading Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 `apps/web` 的页面路由补充按需加载，避免首页直接静态引入所有页面模块。

**Architecture:** 保持 `AppShell` 同步加载，只把页面子路由切换为 React Router 7 路由级 `lazy`。测试同时覆盖路由配置与页面渲染，确保懒加载后 `/` 和 `/playground` 仍可正常访问。

**Tech Stack:** React 19, React Router 7, TypeScript, Vitest, Testing Library

---

### Task 1: 补充路由懒加载测试

**Files:**
- Modify: `apps/web/src/app/router/index.test.tsx`

**Step 1: Write the failing test**

新增一个测试，断言首页路由和 `/playground` 路由使用 `lazy`，并且不再直接声明 `element`。

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/router/index.test.tsx`
Expected: FAIL，原因是当前子路由仍然使用静态 `element`

**Step 3: Write minimal implementation**

如果懒加载后渲染变为异步，同步把页面断言改成 `findByRole`，避免测试误判。

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/router/index.test.tsx`
Expected: PASS

### Task 2: 将页面子路由改为路由级按需加载

**Files:**
- Modify: `apps/web/src/app/router/index.tsx`

**Step 1: Write the failing test**

使用 Task 1 中的失败测试作为回归基线。

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/router/index.test.tsx`
Expected: FAIL，懒加载配置不存在

**Step 3: Write minimal implementation**

移除页面静态导入，给两个子路由分别添加 `lazy: () => import(...).then(...)`，并通过 `Component` 返回页面组件。

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/router/index.test.tsx`
Expected: PASS

### Task 3: 最终验证

**Files:**
- Verify: `apps/web/src/app/router/index.tsx`
- Verify: `apps/web/src/app/router/index.test.tsx`

**Step 1: Run targeted tests**

Run: `npm test -- src/app/router/index.test.tsx`
Expected: PASS

**Step 2: Run project build**

Run: `npm run build`
Expected: PASS
