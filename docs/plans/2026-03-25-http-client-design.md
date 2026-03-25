# HttpClient Design

**Date:** 2026-03-25

**Goal:** 在 `apps/web` 中提供一个基于原生 `fetch` 的通用 HTTP 帮助层，统一处理 RESTful 请求的基础能力、token 注入和响应解析。

## Scope

- 新增 `HttpClient.get/post/put/del`
- 自动从 `localStorage.getItem('token')` 读取授权 token
- 统一处理 JSON 请求体和 JSON 响应
- 统一处理非 `2xx` 错误并暴露结构化错误对象
- 不在本次设计中引入业务 API service、拦截器、自动重试、取消请求或缓存

## Architecture

`HttpClient` 只负责传输层，不承载资源语义。后续业务模块如果需要 RESTful API 调用，应在各自的 `index.service.ts` 中组织 `/users`、`/posts/:id` 之类的资源路径，再复用 `HttpClient` 发起请求。

内部使用一个私有 `request<T>()` 作为统一入口，`get/post/put/del` 只是薄封装。请求会先补默认请求头、拼接 `/api/v1` 前缀、合并本地 token，再交给原生 `fetch`。开发环境通过 Vite 代理把 `/api/v1` 转发到 `http://localhost:5103`，线上则由反向代理接管。响应会先按内容类型解析，再根据 `response.ok` 决定返回数据还是抛出 `HttpClientError`。

## Request Rules

- 相对路径统一规范为以 `/` 开头
- 所有相对路径统一拼接到 `/api/v1`
- 开发环境通过 Vite 代理把 `/api/v1` 转发到 `http://localhost:5103`
- 线上环境继续使用同样的 `/api/v1` 前缀，由反向代理转发到 API 服务
- 默认请求头：
  - `Accept: application/json`
  - `post/put` 在存在 `body` 时追加 `Content-Type: application/json`
- 有 token 时自动追加 `Authorization: Bearer <token>`
- 调用方传入的 `headers` 可以覆盖默认值

## Response Rules

- `204` 或空响应体返回 `undefined`
- 响应头包含 `json` 时自动解析 JSON
- 非 JSON 响应返回文本
- 非 `2xx` 响应抛出 `HttpClientError`

## Error Model

`HttpClientError` 独立放在 `apps/web/src/app/http/HttpClientError/index.ts`，继承 `Error`，至少暴露以下字段：

- `status`
- `statusText`
- `data`
- `url`
- `method`

这样业务层可以按状态码处理错误，也可以直接读取后端返回的错误体。

## Testing

测试覆盖以下行为：

- `get` 自动注入 token 和默认请求头
- `get` 会把相对路径规范到 `/api/v1`
- `post` 自动序列化 JSON 请求体
- `put` 使用正确方法和请求体
- `del` 使用 `DELETE` 方法
- `204` 返回 `undefined`
- 非 `2xx` 响应抛出 `HttpClientError`
- 自定义 `headers` 可以覆盖默认请求头
