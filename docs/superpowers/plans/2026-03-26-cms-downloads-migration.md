# CMS Downloads Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the legacy `Downloads.php` page into the new `apps/api` + `apps/web` stack with a dedicated downloads API, a new public React route, and navigation exposure.

**Architecture:** The backend adds a dedicated public downloads resource under `/api/v1/downloads/client` backed by a repository that reads `web_general.mega_mirror` and `web_general.drive_mirror`. The frontend adds a page-local service and a new `Downloads` page under the existing `AppShell`, keeps the direct client package URL as a page-local constant, and reuses the shared `HttpClient` plus migrated legacy visuals. Tests follow TDD: backend endpoint integration tests first, then frontend service and page tests, then minimal implementation.

**Tech Stack:** ASP.NET Core 10, xUnit, React 19, TypeScript, Vite, SCSS, react-router-dom, Vitest

---

## Chunk 1: Backend Downloads Resource

### Task 1: Reconfirm the downloads slice baseline

**Files:**
- Verify: `AGENTS.md`
- Verify: `docs/superpowers/specs/2026-03-26-cms-downloads-migration-design.md`
- Verify: `apps/api/Program.cs`
- Verify: `apps/api.tests/Auth/TestDoubles/AuthApiFactory.cs`
- Verify: `apps/api.tests/UserProfile/UserProfileEndpointTests.cs`

- [ ] **Step 1: Record the current working tree**

Run: `git status --short`
Expected: only unrelated user files are already present, such as `?? resources/sql/Awaken.psd`

- [ ] **Step 2: Reconfirm the approved design**

Read:
- `docs/superpowers/specs/2026-03-26-cms-downloads-migration-design.md`
- `apps/api/Program.cs`
- `apps/api.tests/Auth/TestDoubles/AuthApiFactory.cs`

Expected: the implementation still targets a dedicated downloads resource instead of expanding `/api/v1/config`

- [ ] **Step 3: Reconfirm the backend verification baseline**

Run: `dotnet test apps/api.tests`
Expected: PASS before touching downloads files

### Task 2: Add backend failing tests for the downloads endpoint

**Files:**
- Create: `apps/api.tests/Downloads/ClientDownloadEndpointTests.cs`
- Create: `apps/api.tests/Downloads/TestDoubles/InMemoryDownloadRepository.cs`
- Modify: `apps/api.tests/Auth/TestDoubles/AuthApiFactory.cs`

- [ ] **Step 1: Write the first failing endpoint tests**

Create `apps/api.tests/Downloads/ClientDownloadEndpointTests.cs` with tests shaped like:

```csharp
using System.Net;
using System.Text.Json.Nodes;

public sealed class ClientDownloadEndpointTests
{
    [Fact]
    public async Task Client_download_returns_all_available_mirrors()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        authApiFactory.DownloadRepository.SetMirrorUrls(
            megaUrl: "https://mega.example/client",
            driveUrl: "https://drive.example/client");

        using var httpClient = authApiFactory.CreateClient();

        var response = await httpClient.GetAsync("/api/v1/downloads/client");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responsePayload = JsonNode.Parse(await response.Content.ReadAsStringAsync())?.AsObject();
        var mirrors = responsePayload?["mirrors"]?.AsArray();

        Assert.Equal(2, mirrors?.Count);
        Assert.Equal("mega", mirrors?[0]?["id"]?.GetValue<string>());
        Assert.Equal("google-drive", mirrors?[1]?["id"]?.GetValue<string>());
    }
}
```

Also cover:
- one blank mirror field is filtered out
- both mirror fields blank returns `200` with an empty array
- no `web_general` row returns `404`

- [ ] **Step 2: Add the in-memory repository test double**

Create `apps/api.tests/Downloads/TestDoubles/InMemoryDownloadRepository.cs` implementing the yet-to-be-created `IDownloadRepository` contract, with helpers like:

```csharp
public sealed class InMemoryDownloadRepository : IDownloadRepository
{
    private DownloadMirrorsRecord? downloadMirrorsRecord;

    public Task<DownloadMirrorsRecord?> GetClientDownloadMirrorsAsync(CancellationToken cancellationToken)
    {
        return Task.FromResult(downloadMirrorsRecord);
    }

    public void RemoveConfigRow()
    {
        downloadMirrorsRecord = null;
    }

    public void SetMirrorUrls(string? megaUrl, string? driveUrl)
    {
        downloadMirrorsRecord = new DownloadMirrorsRecord(
            DriveMirrorUrl: driveUrl ?? string.Empty,
            MegaMirrorUrl: megaUrl ?? string.Empty);
    }
}
```

- [ ] **Step 3: Extend the test factory to inject the download repository**

Modify `apps/api.tests/Auth/TestDoubles/AuthApiFactory.cs` to:
- create `DownloadRepository = new InMemoryDownloadRepository()`
- remove any real `IDownloadRepository` registration
- add `serviceCollection.AddSingleton<IDownloadRepository>(DownloadRepository)`

- [ ] **Step 4: Run the backend test target to verify red**

Run: `dotnet test apps/api.tests --filter ClientDownloadEndpointTests`
Expected: FAIL because the downloads contracts, repository interface, and endpoint do not exist yet

### Task 3: Implement the backend downloads resource

**Files:**
- Create: `apps/api/Contracts/Downloads/ClientDownloadResponse.cs`
- Create: `apps/api/Contracts/Downloads/DownloadMirrorResponse.cs`
- Create: `apps/api/Services/IDownloadRepository.cs`
- Create: `apps/api/Services/DownloadRecords.cs`
- Create: `apps/api/Infrastructure/DownloadRepository.cs`
- Create: `apps/api/Endpoints/DownloadEndpoints.cs`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Add the contracts**

Create:

```csharp
namespace Api.Contracts.Downloads;

public sealed record DownloadMirrorResponse(
    string Id,
    string Label,
    string Url);
```

and:

```csharp
namespace Api.Contracts.Downloads;

public sealed record ClientDownloadResponse(
    IReadOnlyList<DownloadMirrorResponse> Mirrors);
```

Keep names and casing aligned with the current minimal API JSON defaults already used in the project.

- [ ] **Step 2: Add the repository contract and records**

Create `apps/api/Services/DownloadRecords.cs` with:

```csharp
public sealed record DownloadMirrorsRecord(
    string DriveMirrorUrl,
    string MegaMirrorUrl);
```

Create `apps/api/Services/IDownloadRepository.cs` with:

```csharp
public interface IDownloadRepository
{
    Task<DownloadMirrorsRecord?> GetClientDownloadMirrorsAsync(CancellationToken cancellationToken);
}
```

- [ ] **Step 3: Implement the MySQL repository**

Create `apps/api/Infrastructure/DownloadRepository.cs` that:
- uses `LegacyCmsConnectionFactory.CreateGameConnection()`
- queries:

```sql
SELECT mega_mirror, drive_mirror
FROM web_general
ORDER BY id
LIMIT 1;
```

- returns `null` when no row exists
- normalizes `NULL` database values to `string.Empty`

- [ ] **Step 4: Implement the endpoint set**

Create `apps/api/Endpoints/DownloadEndpoints.cs` and map:

```csharp
endpointRouteBuilder.MapGet("/api/v1/downloads/client", HandleGetClientDownloads)
    .WithName("GetClientDownloads");
```

Inside the handler:
- request `IDownloadRepository`
- return `TypedResults.NotFound()` when repository returns `null`
- build the response list by filtering blank URLs
- map labels exactly:
  - `mega` -> `Mirror 1 (Mega)`
  - `google-drive` -> `Mirror 2 (Google Drive)`

- [ ] **Step 5: Register the repository and endpoint set**

Modify `apps/api/Program.cs` to:
- add `builder.Services.AddScoped<IDownloadRepository, DownloadRepository>();`
- call `app.MapDownloadEndpoints();`

- [ ] **Step 6: Run the focused backend test target to verify green**

Run: `dotnet test apps/api.tests --filter ClientDownloadEndpointTests`
Expected: PASS

- [ ] **Step 7: Commit the backend slice**

```bash
git add apps/api apps/api.tests
git commit -m "feat: add cms downloads api resource"
```

## Chunk 2: Frontend Downloads Page

### Task 4: Add frontend failing tests for the service, page, and navigation

**Files:**
- Create: `apps/web/src/pages/Downloads/index.service.test.ts`
- Create: `apps/web/src/pages/Downloads/index.test.tsx`
- Modify: `apps/web/src/components/AppShell/index.test.tsx`

- [ ] **Step 1: Write the failing service test**

Create `apps/web/src/pages/Downloads/index.service.test.ts` following the existing page-local service pattern:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getClientDownloads } from './index.service'

describe('Downloads page service', () => {
  it('requests the client downloads resource through the shared HttpClient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          mirrors: [
            { id: 'mega', label: 'Mirror 1 (Mega)', url: 'https://mega.example/client' },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    return getClientDownloads().then((responseData) => {
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/downloads/client')
      expect(responseData.mirrors[0]?.id).toBe('mega')
    })
  })
})
```

- [ ] **Step 2: Write the failing page test**

Create `apps/web/src/pages/Downloads/index.test.tsx` and cover:
- loading state
- mirrors render when service resolves
- empty state renders when `mirrors` is empty
- unavailable state renders when the request rejects

Use the same mock style as other page tests:

```ts
vi.mock('./index.service', () => {
  return {
    getClientDownloads: getClientDownloadsMock,
  }
})
```

- [ ] **Step 3: Extend the shell navigation test**

Modify `apps/web/src/components/AppShell/index.test.tsx` so the anonymous navigation test asserts:

```ts
expect(screen.getByRole('link', { name: /downloads/i })).toHaveAttribute('href', '/downloads')
```

while still verifying the internal `Playground` route is not exposed.

- [ ] **Step 4: Run the focused frontend tests to verify red**

Run:
- `cd apps/web && npm run test -- src/pages/Downloads/index.service.test.ts`
- `cd apps/web && npm run test -- src/pages/Downloads/index.test.tsx`
- `cd apps/web && npm run test -- src/components/AppShell/index.test.tsx`

Expected: FAIL because the downloads page module and route do not exist yet

### Task 5: Implement the frontend downloads page and route

**Files:**
- Create: `apps/web/src/pages/Downloads/index.tsx`
- Create: `apps/web/src/pages/Downloads/index.module.scss`
- Create: `apps/web/src/pages/Downloads/index.service.ts`
- Modify: `apps/web/src/app/router/index.tsx`
- Modify: `apps/web/src/components/AppShell/index.tsx`
- Create or copy: `apps/web/src/assets/legacy/images/download.png`

- [ ] **Step 1: Copy the legacy download artwork into the new stack**

Copy:

```text
assets/img/download.png
```

to:

```text
apps/web/src/assets/legacy/images/download.png
```

Do not modify the old asset in place.

- [ ] **Step 2: Implement the page-local service**

Create `apps/web/src/pages/Downloads/index.service.ts` matching the repo service style:

```ts
import { HttpClient } from '../../app/http/HttpClient'

type DownloadMirror = {
  id: string
  label: string
  url: string
}

type ClientDownloadsResponse = {
  mirrors: DownloadMirror[]
}

export const getClientDownloads = async (): Promise<ClientDownloadsResponse> => {
  const requestUrl = '/downloads/client'

  return HttpClient.get<ClientDownloadsResponse>(requestUrl)
    .then((responseData) => {
      return Promise.resolve(responseData)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}
```

- [ ] **Step 3: Implement the page**

Create `apps/web/src/pages/Downloads/index.tsx` with:
- a page-local `const directClientDownloadUrl = 'https://drive.google.com/file/d/1i580u6_sw6n-0JqiAmW9TlyQTOGmEeEw/view'`
- `useEffect` request flow for `getClientDownloads()`
- render states:
  - loading
  - mirrors available
  - no mirrors available
  - unavailable
- left column installation guide text migrated from `Downloads.php`
- right column artwork plus mirror cards rendered with `.map()` and stable `mirror.id` keys

- [ ] **Step 4: Implement the SCSS module**

Create `apps/web/src/pages/Downloads/index.module.scss` that:
- follows the existing migrated CMS visual language
- uses SCSS only
- uses `background-color` instead of shorthand when only color is being set
- supports desktop two-column layout and mobile single-column stacking

- [ ] **Step 5: Register the route**

Modify `apps/web/src/app/router/index.tsx` to add a lazy loader and route entry:

```tsx
{
  path: 'downloads',
  lazy: loadDownloadsRoute,
}
```

- [ ] **Step 6: Expose the route in navigation**

Modify `apps/web/src/components/AppShell/index.tsx` to add:

```ts
{
  label: 'Downloads',
  to: '/downloads',
}
```

to the public navigation items without exposing any still-unmigrated module.

- [ ] **Step 7: Re-run the focused frontend tests to verify green**

Run:
- `cd apps/web && npm run test -- src/pages/Downloads/index.service.test.ts`
- `cd apps/web && npm run test -- src/pages/Downloads/index.test.tsx`
- `cd apps/web && npm run test -- src/components/AppShell/index.test.tsx`

Expected: PASS

- [ ] **Step 8: Commit the frontend slice**

```bash
git add apps/web
git commit -m "feat: migrate cms downloads page"
```

## Chunk 3: Full Verification

### Task 6: Run full project verification and capture final state

**Files:**
- Verify: `apps/api/*`
- Verify: `apps/api.tests/*`
- Verify: `apps/web/*`

- [ ] **Step 1: Run backend tests**

Run: `dotnet test apps/api.tests`
Expected: PASS with the downloads endpoint tests included

- [ ] **Step 2: Run backend build**

Run: `dotnet build apps/api`
Expected: PASS with `0 errors`

- [ ] **Step 3: Run frontend tests**

Run: `cd apps/web && npm run test`
Expected: PASS with the new downloads tests included

- [ ] **Step 4: Run frontend lint**

Run: `cd apps/web && npm run lint`
Expected: PASS

- [ ] **Step 5: Run frontend build**

Run: `cd apps/web && npm run build`
Expected: PASS

- [ ] **Step 6: Record the final working tree state**

Run: `git status --short`
Expected: only the intended downloads migration files plus any unrelated pre-existing user files remain

- [ ] **Step 7: Prepare the final summary**

Report:
- the new API route
- the new frontend route
- navigation exposure
- whether `resources/sql` changed
- exact verification commands that passed
