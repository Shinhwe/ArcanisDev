# HttpClient Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 `apps/web` 提供一个基于原生 `fetch` 的 `HttpClient`，统一处理 RESTful API 请求、token 注入和结构化错误。

**Architecture:** 在 `apps/web/src/app/http/HttpClient` 下新增一个纯传输层模块，导出 `get/post/put/del` 四个快捷方法，并由私有 `request<T>()` 统一封装 URL、headers、body 和响应解析。相对路径统一映射到 `/api/v1`，开发环境由 Vite 代理到 `http://localhost:5103`。错误对象独立放在 `apps/web/src/app/http/HttpClientError` 中，业务 service 层后续只负责资源路径和领域语义。

**Tech Stack:** TypeScript, Vite, Vitest, native fetch API

---

### Task 1: 编写 HttpClient 失败测试

**Files:**
- Create: `apps/web/src/app/http/HttpClient/index.test.ts`

**Step 1: Write the failing test**

为 `HttpClient` 编写以下测试：

- `get` 会从 `localStorage.getItem('token')` 注入 `Authorization`
- `get` 会把相对路径映射到 `/api/v1`
- `post` 会序列化 JSON body 并补 `Content-Type`
- `put` 会发送 `PUT`
- `del` 会发送 `DELETE`
- `204` 响应返回 `undefined`
- 非 `2xx` 响应抛出 `HttpClientError`
- 自定义 `headers` 可以覆盖默认值

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/http/HttpClient/index.test.ts`
Expected: FAIL，原因是 `HttpClient` 模块尚不存在

**Step 3: Write minimal implementation**

在 `HttpClient` 模块中提供满足测试的最小实现，不提前加入拦截器、重试、缓存或取消请求等额外能力。

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/http/HttpClient/index.test.ts`
Expected: PASS

### Task 2: 实现 HttpClient 模块

**Files:**
- Create: `apps/web/src/app/http/HttpClient/index.ts`
- Create: `apps/web/src/app/http/HttpClientError/index.ts`
- Modify: `apps/web/vite.config.ts`
- Test: `apps/web/src/app/http/HttpClient/index.test.ts`

**Step 1: Write the failing test**

使用 Task 1 中的测试作为回归基线。

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/http/HttpClient/index.test.ts`
Expected: FAIL，原因是 `HttpClient` 与 `HttpClientError` 尚未实现

**Step 3: Write minimal implementation**

实现以下内容：

- `HttpClient.get/post/put/del`
- 私有 `request<T>()`
- 默认请求头和 token 注入
- `/api/v1` 路径规范化
- JSON 与文本响应解析
- 独立的 `HttpClientError`
- Vite 开发代理

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/http/HttpClient/index.test.ts`
Expected: PASS

### Task 3: 最终验证

**Files:**
- Verify: `apps/web/src/app/http/HttpClient/index.ts`
- Verify: `apps/web/src/app/http/HttpClient/index.test.ts`

**Step 1: Run targeted tests**

Run: `npm test -- src/app/http/HttpClient/index.test.ts`
Expected: PASS

**Step 2: Run existing router regression tests**

Run: `npm test -- src/app/router/index.test.tsx`
Expected: PASS

**Step 3: Run project build**

Run: `npm run build`
Expected: PASS
