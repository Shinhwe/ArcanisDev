# CMS Vote Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the legacy `Vote.php` page into the new `apps/api` + `apps/web` stack with a public vote eligibility endpoint, a new `/vote` route, and a style-first disabled voting experience.

**Architecture:** The backend adds a public `GET /api/v1/votes/eligibility` endpoint backed by a focused `VoteEligibilityService` that inspects the optional CMS auth context and returns placeholder anonymous or authenticated eligibility states. The frontend adds a page-local service, a new `Vote` page, and a navigation item under the existing `AppShell`, preserving the legacy two-column layout while keeping the CTA disabled and clearly marking future link-check, cooldown, vote-submission, and Redis-queue work with `TODO` comments.

**Tech Stack:** ASP.NET Core 10, xUnit, React 19, TypeScript, Vite, SCSS, react-router-dom, Vitest

---

## Chunk 1: Backend Vote Eligibility Resource

### Task 1: Reconfirm the vote slice baseline

**Files:**
- Verify: `AGENTS.md`
- Verify: `docs/superpowers/specs/2026-03-26-cms-vote-migration-design.md`
- Verify: `apps/api/Program.cs`
- Verify: `apps/api/Infrastructure/CmsAuthMiddleware.cs`
- Verify: `apps/api.tests/Auth/TestDoubles/AuthApiFactory.cs`

- [ ] **Step 1: Record the current working tree**

Run: `git status --short`
Expected: only the unrelated user file remains untracked, such as `?? resources/sql/Awaken.psd`

- [ ] **Step 2: Reconfirm the approved vote design**

Read:
- `docs/superpowers/specs/2026-03-26-cms-vote-migration-design.md`
- `apps/api/Infrastructure/CmsAuthMiddleware.cs`
- `apps/api.tests/Auth/TestDoubles/AuthApiFactory.cs`

Expected:
- `GET /api/v1/votes/eligibility` is public
- anonymous requests return `login_required`
- authenticated requests return `link_required`
- `voteIntervalHours` is `24`

- [ ] **Step 3: Reconfirm the backend verification baseline**

Run: `dotnet test apps/api.tests`
Expected: PASS before touching vote files

### Task 2: Add backend failing tests for vote eligibility

**Files:**
- Create: `apps/api.tests/Votes/VoteEligibilityEndpointTests.cs`

- [ ] **Step 1: Write the first failing endpoint tests**

Create `apps/api.tests/Votes/VoteEligibilityEndpointTests.cs` with tests shaped like:

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json.Nodes;

public sealed class VoteEligibilityEndpointTests
{
    [Fact]
    public async Task Anonymous_request_returns_login_required_vote_eligibility()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        using var httpClient = authApiFactory.CreateClient();

        var response = await httpClient.GetAsync("/api/v1/votes/eligibility");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responsePayload = JsonNode.Parse(await response.Content.ReadAsStringAsync())?.AsObject();

        Assert.False(responsePayload?["canVote"]?.GetValue<bool>());
        Assert.Equal("login_required", responsePayload?["status"]?.GetValue<string>());
        Assert.Equal(24, responsePayload?["voteIntervalHours"]?.GetValue<int>());
    }
}
```

Also cover:
- an authenticated request with a valid bearer token returns `link_required`
- `hasLinkedGameAccount` is `false` in both current states
- `nextEligibleAt` is `null` in both current states

- [ ] **Step 2: Run the focused backend test target to verify red**

Run: `dotnet test apps/api.tests --filter VoteEligibilityEndpointTests`
Expected: FAIL because the vote contracts, service, and endpoint do not exist yet

### Task 3: Implement the backend vote eligibility resource

**Files:**
- Create: `apps/api/Contracts/Votes/VoteEligibilityResponse.cs`
- Create: `apps/api/Services/VoteEligibilityRecords.cs`
- Create: `apps/api/Services/VoteEligibilityService.cs`
- Create: `apps/api/Endpoints/VoteEndpoints.cs`
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Add the API contract**

Create `apps/api/Contracts/Votes/VoteEligibilityResponse.cs` with:

```csharp
namespace Api.Contracts.Votes;

public sealed record VoteEligibilityResponse(
    bool CanVote,
    string Status,
    string Message,
    bool HasLinkedGameAccount,
    int VoteIntervalHours,
    DateTimeOffset? NextEligibleAt);
```

- [ ] **Step 2: Add the internal record**

Create `apps/api/Services/VoteEligibilityRecords.cs` with:

```csharp
public sealed record VoteEligibilityRecord(
    bool CanVote,
    string Status,
    string Message,
    bool HasLinkedGameAccount,
    int VoteIntervalHours,
    DateTimeOffset? NextEligibleAt);
```

- [ ] **Step 3: Add the focused service**

Create `apps/api/Services/VoteEligibilityService.cs` that exposes:

```csharp
public sealed class VoteEligibilityService
{
    public VoteEligibilityRecord GetVoteEligibility(CmsAuthContext? authContext)
    {
        if (authContext is null)
        {
            return new VoteEligibilityRecord(
                CanVote: false,
                Status: "login_required",
                Message: "Login is required before voting.",
                HasLinkedGameAccount: false,
                VoteIntervalHours: 24,
                NextEligibleAt: null);
        }

        // TODO: replace this placeholder with a real linked-game-account lookup.
        // TODO: evaluate the 24-hour cooldown when real vote state exists.
        // TODO: add POST /api/v1/votes and enqueue successful vote events to Redis.
        return new VoteEligibilityRecord(
            CanVote: false,
            Status: "link_required",
            Message: "Link a game account before voting.",
            HasLinkedGameAccount: false,
            VoteIntervalHours: 24,
            NextEligibleAt: null);
    }
}
```

- [ ] **Step 4: Add the endpoint set**

Create `apps/api/Endpoints/VoteEndpoints.cs` and map:

```csharp
endpointRouteBuilder.MapGet("/api/v1/votes/eligibility", HandleGetVoteEligibilityAsync)
    .WithName("GetVoteEligibility");
```

Inside the handler:
- read `httpContext.GetCmsAuthContext()`
- call `VoteEligibilityService`
- map the record into `VoteEligibilityResponse`
- return `TypedResults.Ok(...)`

- [ ] **Step 5: Register the service and endpoint set**

Modify `apps/api/Program.cs` to:
- add `builder.Services.AddScoped<VoteEligibilityService>();`
- call `app.MapVoteEndpoints();`

- [ ] **Step 6: Run the focused backend test target to verify green**

Run: `dotnet test apps/api.tests --filter VoteEligibilityEndpointTests`
Expected: PASS

## Chunk 2: Frontend Vote Page, Service, and Navigation

### Task 4: Add frontend failing tests for the vote service, page, and navigation

**Files:**
- Create: `apps/web/src/pages/Vote/index.service.test.ts`
- Create: `apps/web/src/pages/Vote/index.test.tsx`
- Modify: `apps/web/src/components/AppShell/index.test.tsx`

- [ ] **Step 1: Write the failing vote service test**

Create `apps/web/src/pages/Vote/index.service.test.ts` with a test shaped like:

```ts
import { describe, expect, it, vi } from 'vitest'

import { httpClient } from '../../app/http'
import { getVoteEligibility } from './index.service'

vi.mock('../../app/http', () => {
  return {
    httpClient: {
      get: vi.fn(),
    },
  }
})

describe('getVoteEligibility', () => {
  it('requests the vote eligibility resource', async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      canVote: false,
      hasLinkedGameAccount: false,
      message: 'Login is required before voting.',
      nextEligibleAt: null,
      status: 'login_required',
      voteIntervalHours: 24,
    })

    const response = await getVoteEligibility()

    expect(httpClient.get).toHaveBeenCalledWith('/api/v1/votes/eligibility')
    expect(response.status).toBe('login_required')
  })
})
```

- [ ] **Step 2: Write the failing vote page tests**

Create `apps/web/src/pages/Vote/index.test.tsx` and cover:
- loading state while the request is pending
- `login_required` state renders the page heading, disabled `Vote Now` button, and login-required message
- `link_required` state renders the disabled button and link-required message
- request failure renders an unavailable message and keeps the button disabled
- the legacy `24 hours` rule is visible inside the instructions list

Use the same mocking approach already used by `apps/web/src/pages/Downloads/index.test.tsx` and `apps/web/src/pages/Patch/index.test.tsx`.

- [ ] **Step 3: Extend the shell navigation tests**

Modify `apps/web/src/components/AppShell/index.test.tsx` to assert that `Vote` is visible in the primary navigation.

- [ ] **Step 4: Run the focused frontend vote test target to verify red**

Run: `cd apps/web && npm run test -- src/pages/Vote/index.service.test.ts src/pages/Vote/index.test.tsx src/components/AppShell/index.test.tsx`
Expected: FAIL because the route, page, and service do not exist yet

### Task 5: Implement the frontend vote service, page, and router wiring

**Files:**
- Create: `apps/web/src/pages/Vote/index.tsx`
- Create: `apps/web/src/pages/Vote/index.module.scss`
- Create: `apps/web/src/pages/Vote/index.service.ts`
- Modify: `apps/web/src/app/router/index.tsx`
- Modify: `apps/web/src/components/AppShell/index.tsx`

- [ ] **Step 1: Add the page-local vote service**

Create `apps/web/src/pages/Vote/index.service.ts` with:

```ts
import { httpClient } from '../../app/http'

export type VoteEligibilityResponse = {
  canVote: boolean
  hasLinkedGameAccount: boolean
  message: string
  nextEligibleAt: string | null
  status: 'login_required' | 'link_required' | 'cooldown' | 'eligible'
  voteIntervalHours: number
}

export const getVoteEligibility = async () => {
  return httpClient.get<VoteEligibilityResponse>('/api/v1/votes/eligibility')
}
```

- [ ] **Step 2: Add the vote page component**

Create `apps/web/src/pages/Vote/index.tsx` that:
- fetches vote eligibility on mount
- tracks `isVoteEligibilityLoading`, `voteEligibility`, and `voteEligibilityErrorMessage`
- renders the migrated two-column layout
- shows a disabled `Vote Now` button in every current state
- keeps the instructions list and updates the cadence line to `Can vote every 24 hours.`
- uses descriptive handler names that follow the repository convention
- keeps explicit `TODO` comments next to the future vote-submission path

Use a structure like:

```tsx
const Vote = () => {
  const [voteEligibility, setVoteEligibility] = useState<VoteEligibilityResponse | null>(null)
  const [isVoteEligibilityLoading, setIsVoteEligibilityLoading] = useState(true)
  const [voteEligibilityErrorMessage, setVoteEligibilityErrorMessage] = useState('')

  useEffect(() => {
    let isCurrentRequestActive = true

    getVoteEligibility()
      .then((responseData) => {
        if (isCurrentRequestActive === false) {
          return
        }

        setVoteEligibility(responseData)
      })
      .catch(() => {
        if (isCurrentRequestActive === false) {
          return
        }

        setVoteEligibilityErrorMessage('Vote is currently unavailable.')
      })
      .finally(() => {
        if (isCurrentRequestActive === false) {
          return
        }

        setIsVoteEligibilityLoading(false)
      })

    return () => {
      isCurrentRequestActive = false
    }
  }, [])

  const handleAttemptVote = () => {
    // TODO: call POST /api/v1/votes when linked-account voting is available.
    // TODO: successful vote submissions will enqueue a Redis message for the game server.
  }
}
```

- [ ] **Step 3: Add the SCSS module**

Create `apps/web/src/pages/Vote/index.module.scss` that:
- follows the project SCSS module pattern
- preserves the old layout hierarchy with a responsive two-column shell
- uses `background-color` instead of `background` when only a color is being set
- uses CSS variables where dynamic styling would otherwise need inline visual values
- reuses the migrated visual language already used by `Downloads`, `Patch`, and `UserControlPanel`

- [ ] **Step 4: Wire the router and shell navigation**

Modify `apps/web/src/app/router/index.tsx` to:
- add a lazy loader for `../../pages/Vote`
- add a `path: 'vote'` child route

Modify `apps/web/src/components/AppShell/index.tsx` to:
- add `{ label: 'Vote', to: '/vote' }` to `navigationItems`
- keep the new navigation free of unmigrated modules

- [ ] **Step 5: Run the focused frontend vote test target to verify green**

Run: `cd apps/web && npm run test -- src/pages/Vote/index.service.test.ts src/pages/Vote/index.test.tsx src/components/AppShell/index.test.tsx`
Expected: PASS

## Chunk 3: Full Verification and Final Review

### Task 6: Run the relevant backend and frontend verification commands

**Files:**
- Verify: `apps/api/Contracts/Votes/VoteEligibilityResponse.cs`
- Verify: `apps/api/Services/VoteEligibilityRecords.cs`
- Verify: `apps/api/Services/VoteEligibilityService.cs`
- Verify: `apps/api/Endpoints/VoteEndpoints.cs`
- Verify: `apps/api.tests/Votes/VoteEligibilityEndpointTests.cs`
- Verify: `apps/web/src/pages/Vote/index.tsx`
- Verify: `apps/web/src/pages/Vote/index.module.scss`
- Verify: `apps/web/src/pages/Vote/index.service.ts`
- Verify: `apps/web/src/pages/Vote/index.service.test.ts`
- Verify: `apps/web/src/pages/Vote/index.test.tsx`
- Verify: `apps/web/src/app/router/index.tsx`
- Verify: `apps/web/src/components/AppShell/index.tsx`

- [ ] **Step 1: Run the focused backend tests**

Run: `dotnet test apps/api.tests --filter VoteEligibilityEndpointTests`
Expected: PASS

- [ ] **Step 2: Run the full backend test suite**

Run: `dotnet test apps/api.tests`
Expected: PASS

- [ ] **Step 3: Run the backend build**

Run: `dotnet build apps/api`
Expected: `0 Warning(s)` and `0 Error(s)`

- [ ] **Step 4: Run the focused frontend vote tests**

Run: `cd apps/web && npm run test -- src/pages/Vote/index.service.test.ts src/pages/Vote/index.test.tsx src/components/AppShell/index.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd apps/web && npm run test`
Expected: PASS

- [ ] **Step 6: Run the frontend lint command**

Run: `cd apps/web && npm run lint`
Expected: PASS

- [ ] **Step 7: Run the frontend build**

Run: `cd apps/web && npm run build`
Expected: PASS

- [ ] **Step 8: Recheck the working tree**

Run: `git status --short`
Expected:
- modified or added files only under `apps/web`, `apps/api`, `apps/api.tests`, and docs
- the unrelated `?? resources/sql/Awaken.psd` remains untouched

### Task 7: Final code review checklist

**Files:**
- Verify: `docs/superpowers/specs/2026-03-26-cms-vote-migration-design.md`
- Verify: `docs/superpowers/plans/2026-03-26-cms-vote-migration.md`
- Verify: all vote-related code touched in Tasks 3 and 5

- [ ] **Step 1: Re-read the design before closing**

Read: `docs/superpowers/specs/2026-03-26-cms-vote-migration-design.md`
Expected: implementation still matches the approved style-first scope

- [ ] **Step 2: Confirm future work is clearly marked**

Verify:
- the backend contains `TODO` markers for linked-account lookup, cooldown evaluation, `POST /api/v1/votes`, and Redis queue publishing
- the frontend contains `TODO` markers for enabling the CTA and submitting votes later

- [ ] **Step 3: Summarize the actual shipped behavior**

Confirm:
- `Vote` is visible in navigation
- `/vote` loads in the new app shell
- anonymous users see `login_required`
- authenticated users see `link_required`
- the CTA remains disabled
- the instructions mention `24` hours

