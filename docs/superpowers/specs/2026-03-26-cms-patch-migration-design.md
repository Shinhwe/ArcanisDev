# CMS Patch Migration Design

**Date:** 2026-03-26

## Goal

Migrate the legacy `patch.php` page into the new `apps/web` + `apps/api` stack as a public read-only CMS slice that preserves:

- the legacy page route shape
- the legacy patch/news visual language
- category-driven article browsing
- author-written rich HTML article content from the existing admin panel

This migration keeps the legacy PHP page and legacy admin posting workflow untouched while exposing a new React page and RESTful read APIs backed by the existing `categories` and `posts` tables.

## Scope

This slice covers:

- a migrated React page at `/patch`
- public REST endpoints for news categories, post list pagination, and post details
- category-driven article browsing with URL-synced state
- rich-text article rendering through sanitized iframe HTML documents
- infinite loading driven by a bottom `IntersectionObserver` probe
- navigation exposure for the migrated patch page only

This slice does not cover:

- any change to legacy PHP pages
- any change to the legacy admin posting flow
- forum migration
- rankings migration
- vote migration
- donate migration
- comment systems
- like systems
- article creation or editing in the new stack
- Bootstrap JavaScript
- jQuery
- database schema changes

## Constraints

- Only modify `apps/web` and `apps/api`
- Follow `/Users/shinhwe/ArcanisDev/AGENTS.md`
- Keep the frontend page route at `/patch` to match the legacy page naming
- Keep the page URL query parameter name `category_id`
- Add `post_id` as a new query parameter for detail deep links
- Continue reusing `apps/web/src/app/http/HttpClient`
- Keep page-owned requests inside `index.service.ts`
- Use RESTful API naming under `/api/v1`
- Do not expose unmigrated or internal modules in the new frontend navigation
- Bootstrap styles may be reused, but Bootstrap JavaScript is forbidden
- Do not use jQuery
- Legacy likes must not be migrated
- Keep code changes inside `apps/web` and `apps/api`; do not add or modify files under legacy PHP paths or separate test projects in this slice

## Legacy Findings

The legacy implementation is one news system, not separate news and patches modules:

- the public entry point is only `patch.php`
- the admin panel manages `Manage News Categories` and `Manage News Posts`
- `Patch Notes` is only one category inside `categories`
- the legacy page mixes patch notes, announcements, notices, Q&A, and updates under one UI

The legacy page behavior is currently split across:

- `patch.php`
- `news/news.js`
- `news/get_categories.php`
- `news/get_posts.php`
- `news/get_post.php`
- `news/check_if_liked.php`
- `news/like_post.php`

The migrated slice should keep the public page semantics at `/patch`, but the backend API resource should use the clearer `news` naming because the data model is category-based news content.

## Current Data Model

The migrated slice reads the existing legacy CMS tables:

- `categories`
- `posts`

Current legacy content is authored through the old admin panel using TinyMCE. That means `posts.content` already contains a mix of:

- plain text content
- HTML fragments such as `<p>` and `<strong>`

This migration must preserve rich-text display while removing unsafe HTML behavior.

### Table field assumptions

The current legacy schema shape used by this slice is:

- `categories.id` -> `int`, primary key
- `categories.name` -> `varchar(255)`, not null
- `categories.created_at` -> `timestamp`, nullable
- `posts.id` -> `int`, primary key
- `posts.category_id` -> `int`, foreign key to `categories.id`
- `posts.title` -> `varchar(255)`, not null
- `posts.content` -> `text`, not null
- `posts.created_at` -> `timestamp`, nullable, default `CURRENT_TIMESTAMP`

Legacy admin posting currently inserts rows with `NOW()`, so published rows are expected to have a non-null `created_at`.

For this migration:

- rows with `posts.created_at IS NULL` are treated as invalid legacy content
- invalid legacy rows are excluded from list responses
- direct detail requests for invalid legacy rows return `404`

The current schema has no category visibility or publish-state field, so the categories endpoint returns every row from `categories`.

### `created_at` time semantics

This slice depends on deterministic timestamp handling for keyset pagination.

Time handling rules:

- the repository must set the MySQL session time zone to `+00:00` before running news queries
- the time zone command must run on every leased database connection immediately after `OpenAsync` and before any news query because pooled connections cannot assume a preserved session time zone
- if the time zone command fails, the request must fail with `500` rather than continue with ambiguous timestamp semantics
- all `posts.created_at` values used by the API are treated as UTC timestamps after that session normalization
- API responses serialize timestamps using the exact format `yyyy-MM-ddTHH:mm:ss.fffffffZ`
- cursor timestamps use the same exact format
- frontend and backend accept only that exact cursor timestamp format for this slice

That means the canonical wire format for timestamps in this slice is:

- `2024-11-17T17:38:37.0000000Z`

## Chosen Approach

Use a public `/patch` React route backed by dedicated `/api/v1/news/*` read APIs.

### Why this approach

- It preserves the legacy route and page identity where visual assets already imply patch/news wording
- It keeps the public UI aligned with the old `patch.php` entry point
- It models the backend around the real data boundary: one category-based news system
- It allows safe rich-text rendering by centralizing HTML sanitization inside `apps/api`

### Rejected alternatives

1. Public page route `/news`
   - cleaner naming for new code
   - conflicts with the existing legacy page identity and visual wording
2. Frontend-side sanitization with raw HTML from the API
   - smaller backend diff
   - weaker security boundary and more drift risk
3. Convert HTML content into plain text, markdown, or custom blocks
   - safer by default
   - breaks author intent and does not preserve existing TinyMCE content

## Public Route Design

### Route

`/patch`

### Query parameters

- `category_id`
- `post_id`

### Preferred URL shapes

- category list state: `/patch?category_id=3`
- article detail state: `/patch?category_id=3&post_id=6`

### Frontend route params versus API params

The public page URL keeps legacy-style snake_case params:

- `category_id`
- `post_id`

The page-local service translates them into the API contract:

- `category_id` -> `categoryId`
- `post_id` -> detail route path parameter
- page-local pagination state -> `pageSize` and `cursor`

### Navigation exposure

Expose one migrated navigation item only:

- `Patch Notes`

Do not expose duplicate legacy labels such as `Events` that point to the same page.

## API Design

### Routes

- `GET /api/v1/news/categories`
- `GET /api/v1/news/posts`
- `GET /api/v1/news/posts/{postId}`

### `GET /api/v1/news/categories`

Response shape:

```json
{
  "categories": [
    {
      "id": 3,
      "name": "Patch Notes"
    }
  ]
}
```

Behavior:

- read all rows from `categories`
- return them ordered by `id ASC` so the UI gets a deterministic legacy-like category order
- return `200` with an empty array if there are no categories

Field types:

- `categories[].id` is a JSON number
- `categories[].name` is a JSON string

### `GET /api/v1/news/posts`

Query parameters:

- `categoryId`
- `pageSize`
- `cursor`

Parameter rules:

- `categoryId` is required
- `categoryId` must be a positive integer
- `pageSize` is optional
- default `pageSize` is `13` to match the legacy page batch size
- minimum `pageSize` is `1`
- maximum `pageSize` is `50`
- `cursor` is optional

Cursor format:

- `cursor` must use the format `{createdAtUtc}_{postId}`
- `createdAtUtc` must use the exact format `yyyy-MM-ddTHH:mm:ss.fffffffZ`
- `postId` must be a positive integer
- example:
  - `2024-11-17T17:38:37.0000000Z_6`

Invalid request handling:

- missing, non-numeric, or non-positive `categoryId` returns `400`
- invalid `pageSize` returns `400`
- malformed or tampered `cursor` returns `400`
- unknown but syntactically valid `categoryId` returns `200` with `items: []`

Response shape:

```json
{
  "items": [
    {
      "id": 6,
      "categoryId": 3,
      "title": "Patch v1.6 Preview",
      "createdAt": "2024-11-17T17:38:37.0000000Z"
    }
  ],
  "nextCursor": "2024-11-17T17:38:37.0000000Z_6"
}
```

Behavior:

- require a valid `categoryId`
- sort by:
  - `created_at DESC`
  - `id DESC`
- use keyset pagination, not offset pagination
- interpret `cursor` as the last seen `(created_at, id)` pair
- exclude rows where `posts.created_at IS NULL` before applying ordering, pagination, and cursor generation
- filter the next page with the strict DESC keyset predicate:
  - `created_at < cursorCreatedAtUtc`
  - or `created_at = cursorCreatedAtUtc AND id < cursorPostId`
- return article summary items only
- return `nextCursor` based on the last valid item in the current batch
- return `200` with `items: []` if the category has no posts or the cursor is exhausted
- format `createdAt` and `nextCursor` from UTC-normalized timestamps
- treat `nextCursor` as an opaque string token in the frontend

Field types:

- `items[].id` is a JSON number
- `items[].categoryId` is a JSON number
- `items[].title` is a JSON string
- `items[].createdAt` is a JSON string using the exact format `yyyy-MM-ddTHH:mm:ss.fffffffZ`
- `nextCursor` is either `null` or a JSON string using the exact format `{createdAtUtc}_{postId}`

Cursor transport rule:

- the page-local service must URL-encode `cursor` when sending it as an API query parameter
- the backend parses the decoded query value only
- malformed decoded values return `400`

### `GET /api/v1/news/posts/{postId}`

Response shape:

```json
{
  "post": {
    "id": 6,
    "categoryId": 3,
    "categoryName": "Patch Notes",
    "title": "Patch v1.6 Preview",
    "createdAt": "2024-11-17T17:38:37.0000000Z",
    "iframeHtmlDocument": "<!doctype html>..."
  }
}
```

Behavior:

- look up the post and its category
- return `404` if the post does not exist
- return `404` if the matched row is invalid legacy content with null `created_at`
- sanitize the stored article content
- wrap the sanitized body into a full iframe-ready HTML document
- return the document string in `iframeHtmlDocument`

Field types:

- `post.id` is a JSON number
- `post.categoryId` is a JSON number
- `post.categoryName` is a JSON string
- `post.title` is a JSON string
- `post.createdAt` is a JSON string using the exact format `yyyy-MM-ddTHH:mm:ss.fffffffZ`
- `post.iframeHtmlDocument` is a JSON string

### API error response shape

When these news endpoints return `400`, they should reuse the existing API error contract already used by auth and user settings endpoints:

```json
{
  "code": "news.invalid_cursor",
  "message": "The supplied cursor is invalid.",
  "fieldErrors": {
    "cursor": [
      "Cursor format must be {createdAtUtc}_{postId}."
    ]
  }
}
```

This matches the current `ApiErrorResponse` shape:

- `code`
- `message`
- `fieldErrors`

`fieldErrors` may be omitted or `null` when there is no field-level detail.

Suggested error codes:

- `news.invalid_category_id`
- `news.invalid_page_size`
- `news.invalid_cursor`

## Pagination And Loading Strategy

### Backend pagination

The list endpoint provides `nextCursor`, but does not provide `hasMoreData`.

### Frontend `hasMoreData`

The frontend determines whether more data may exist by using the user-approved rule:

- if `items.length === pageSize`, keep `hasMoreData = true`
- if `items.length < pageSize`, set `hasMoreData = false`

If the total count is an exact multiple of `pageSize`, the frontend may perform one extra request and then stop when it receives an empty array. That tradeoff is acceptable for this slice.

### Infinite loading trigger

The page uses a bottom `IntersectionObserver` probe instead of scroll math:

- render a `1px` transparent sentinel line at the bottom of the article list
- observe it with `IntersectionObserver`
- request the next page only when all conditions are true:
  - the current category is valid
  - a request is not already in flight
  - `hasMoreData === true`

## Rich Text And Iframe Design

### Why iframe rendering is required

Legacy article content is authored as HTML through TinyMCE. The migrated page must preserve that authoring output while preventing article styles from leaking into the surrounding React page.

Using `iframe srcDoc` gives:

- style isolation between article content and page chrome
- a safer rendering boundary than injecting sanitized HTML directly into the React DOM
- the ability to tune rich-text styles inside the article document without destabilizing the outer layout

### HTML sanitization boundary

Sanitization belongs in `apps/api`, not in `apps/web`.

That keeps:

- one security policy
- one testable implementation
- one output format for all future consumers

### Allowed tags

Preserve common editorial tags:

- `p`
- `br`
- `div`
- `span`
- `h1`
- `h2`
- `h3`
- `h4`
- `h5`
- `h6`
- `strong`
- `b`
- `em`
- `i`
- `u`
- `ul`
- `ol`
- `li`
- `blockquote`
- `pre`
- `code`
- `table`
- `thead`
- `tbody`
- `tr`
- `th`
- `td`
- `a`
- `img`

### Allowed attributes

Keep the allowed attribute list narrow:

- `a[href|title|target|rel]`
- `img[src|alt|title|width|height]`
- `p[style]`
- `div[style]`
- `span[style]`
- `h1[style]`
- `h2[style]`
- `h3[style]`
- `h4[style]`
- `h5[style]`
- `h6[style]`
- `ul[style]`
- `ol[style]`
- `li[style]`
- `table[style]`
- `thead[style]`
- `tbody[style]`
- `tr[style]`
- `th[style]`
- `td[style]`

All other attributes should be removed unless a future requirement proves they are needed.

### Disallowed content

Always remove:

- `script`
- `style`
- `iframe`
- `object`
- `embed`
- `form`
- `input`
- `button`
- `textarea`
- `select`
- any `on*` event attribute
- `javascript:` URLs
- all `data:` URLs

### Link and image normalization

Normalize links and images with explicit URL rules:

- allow only `http:` and `https:` absolute URLs
- allow site-root relative URLs that begin with `/`
- allow legacy relative URLs such as `images/a.png` or `../img/a.png` by normalizing them against the site root and collapsing dot segments into a final site-root path
- remove all other URL schemes
- remove protocol-relative URLs

For links:

- force `target="_blank"`
- force `rel="noopener noreferrer"`

For images:

- preserve `width` and `height` only if they are numeric
- apply iframe-local CSS so images stay within the article width
- drop any image whose `src` fails the allowed URL rules

### CSS style sanitization

To preserve common TinyMCE formatting without allowing arbitrary styling, keep `style` only after property-level sanitization.

Allowed inline CSS properties:

- `text-align`
- `font-weight`
- `font-style`
- `text-decoration`
- `color`
- `background-color`

Disallowed inline CSS behavior:

- remove every CSS property not in the whitelist
- remove `url(...)`
- remove `expression(...)`
- remove `!important`

Class attributes are always removed in this slice. This is an intentional fidelity tradeoff: preserve common editorial formatting, but do not preserve arbitrary theme- or script-coupled class behavior from legacy TinyMCE output.

### Plain text fallback

If `posts.content` does not contain meaningful HTML, treat it as plain text:

- parse the raw content as an HTML fragment first
- sanitize the parsed fragment
- if the sanitized fragment contains at least one allowed element other than empty layout-only remnants such as standalone `<br>`, use rich HTML mode
- otherwise use plain text mode based on the original raw source string

Plain text mode rules:

- normalize line endings to `\n`
- HTML-encode the original raw text
- split the encoded text on double line breaks into paragraphs
- replace single line breaks inside a paragraph with `<br />`
- wrap each paragraph in `<p>`

### Generated iframe document

The API-generated document should include:

- `<!doctype html>`
- `html`, `head`, and `body`
- a charset meta tag
- a viewport meta tag
- internal CSS for article typography and rich content
- the sanitized article body

### Iframe sandboxing

The frontend iframe should:

- use `srcDoc`
- use `sandbox="allow-same-origin allow-popups"`
- avoid `allow-scripts`
- rely on the sanitized, script-free generated document so same-origin readability can be safely used for height measurement

## Backend Design

### Dependency addition

`apps/api` currently has no HTML parser package. Add a dedicated HTML parsing dependency so sanitization can be implemented with DOM-aware traversal instead of brittle string replacement.

Recommended package:

- `HtmlAgilityPack`

### Files

- Create: `apps/api/Endpoints/NewsEndpoints.cs`
- Create: `apps/api/Contracts/News/NewsCategoryResponse.cs`
- Create: `apps/api/Contracts/News/NewsCategoryListResponse.cs`
- Create: `apps/api/Contracts/News/NewsPostListItemResponse.cs`
- Create: `apps/api/Contracts/News/NewsPostListResponse.cs`
- Create: `apps/api/Contracts/News/NewsPostDetailResponse.cs`
- Create: `apps/api/Contracts/News/NewsPostResponse.cs`
- Create: `apps/api/Services/INewsRepository.cs`
- Create: `apps/api/Services/NewsRecords.cs`
- Create: `apps/api/Services/INewsHtmlDocumentBuilder.cs`
- Create: `apps/api/Services/NewsHtmlDocumentBuilder.cs`
- Create: `apps/api/Infrastructure/NewsRepository.cs`
- Modify: `apps/api/Program.cs`
- Modify: `apps/api/api.csproj`

### Responsibilities

- `NewsEndpoints.cs`
  - map the public routes
  - validate query parameters
  - translate repository records into response contracts
- `INewsRepository.cs`
  - define read methods for categories, list pagination, and post details
- `NewsRepository.cs`
  - query `categories` and `posts`
  - implement deterministic ordering
  - implement keyset pagination
  - acquire a database connection inside each public method
  - run `SET time_zone = '+00:00'` immediately after `OpenAsync` inside each public method
- `INewsHtmlDocumentBuilder.cs`
  - define the HTML sanitization and iframe document contract
- `NewsHtmlDocumentBuilder.cs`
  - sanitize stored article content
  - normalize links and images
  - build the final iframe document string
- `Program.cs`
  - register the repository and HTML builder
  - map the endpoint set
- `api.csproj`
  - add the HTML parsing package reference

### Minimal interface shapes

The implementation plan should preserve these boundaries:

```csharp
public interface INewsRepository
{
    Task<IReadOnlyList<NewsCategoryRecord>> GetCategoriesAsync(
        CancellationToken cancellationToken);

    Task<NewsPostListPageRecord> GetPostsAsync(
        int categoryId,
        int pageSize,
        NewsPostCursorRecord? cursor,
        CancellationToken cancellationToken);

    Task<NewsPostDetailRecord?> GetPostByIdAsync(
        int postId,
        CancellationToken cancellationToken);
}

public interface INewsHtmlDocumentBuilder
{
    string BuildArticleIframeHtmlDocument(string rawContent);
}
```

Minimal record shapes:

```csharp
public sealed record NewsCategoryRecord(
    int Id,
    string Name);

public sealed record NewsPostCursorRecord(
    DateTimeOffset CreatedAtUtc,
    int PostId);

public sealed record NewsPostListItemRecord(
    int Id,
    int CategoryId,
    string Title,
    DateTimeOffset CreatedAtUtc);

public sealed record NewsPostListPageRecord(
    IReadOnlyList<NewsPostListItemRecord> Items,
    NewsPostCursorRecord? NextCursor);

public sealed record NewsPostDetailRecord(
    int Id,
    int CategoryId,
    string CategoryName,
    string Title,
    string RawContent,
    DateTimeOffset CreatedAtUtc);
```

## Frontend Design

### Files

- Create: `apps/web/src/pages/Patch/index.tsx`
- Create: `apps/web/src/pages/Patch/index.module.scss`
- Create: `apps/web/src/pages/Patch/index.service.ts`
- Create: `apps/web/src/pages/Patch/index.service.test.ts`
- Create: `apps/web/src/pages/Patch/index.test.tsx`
- Modify: `apps/web/src/app/router/index.tsx`
- Modify: `apps/web/src/components/AppShell/index.tsx`

### Page composition

Preserve the legacy patch page composition:

- left column:
  - page section title
  - category navigation
  - article list
  - bottom loading sentinel
- right column:
  - article title and metadata
  - rich-text article iframe
  - detail loading and error states

### URL-driven state

The page state is derived from React Router search parameters:

- `category_id` selects the active category
- `post_id` selects the active article detail

State transitions:

- initial load:
  - if `post_id` is present, fetch detail first
  - if detail succeeds, use the returned `categoryId` as the canonical category before loading the category list page
  - if detail returns `404`, keep `post_id` in the URL, keep or normalize `category_id`, load the category list state, and render a detail not-found state
  - if `post_id` is absent, fetch categories first
  - normalize invalid or missing `category_id` to the first valid category
- category change:
  - clear current list state
  - clear `post_id`
  - fetch the first page for the new category
- article click:
  - set `post_id`
  - fetch post detail
- browser navigation:
  - let React Router drive state restoration

### Detail route normalization

Preferred detail links include both `category_id` and `post_id`.

If a detail response succeeds and the current route state is stale, normalize the URL to the post's true category:

- if `post_id` exists without `category_id`, write back the returned `categoryId`
- if `post_id` belongs to a different category than the current `category_id`, replace `category_id` with the returned `categoryId`

This avoids false not-found states when links are shared with incomplete or stale category params.

If `post_id` exists and detail returns `404`, keep `post_id` in the URL and continue rendering the active category list state with a detail not-found panel.

### Default no-detail state

If there is no `post_id` in the current route:

- do not auto-select the first article
- keep the current `category_id`
- render the article list for the active category
- show a detail empty state in the right column prompting the user to choose an article

### Iframe height handling

The page should automatically size the article iframe to its content height:

- measure iframe document height on load
- update the outer iframe height state
- remeasure after rich media loads
- use `ResizeObserver` when available for document body size changes

## Error Handling

### Category loading

- no categories: show an empty-state message
- request failure: show an unavailable message and keep the page shell usable

### List loading

- no posts in category: show a category-local empty state
- later-page failure: keep already loaded items and show a retry affordance near the sentinel area

### Detail loading

- post not found: show a not-found detail state
- request failure: show an unavailable detail state without clearing the list

### Invalid search params

- invalid `category_id`: normalize to the first valid category
- invalid `post_id`: preserve the URL value and show a detail not-found state

## Visual Design Notes

- Preserve the current migrated legacy visual language already established in `Home`, `Downloads`, and `UserControlPanel`
- Keep the main page copy aligned with the legacy page wording:
  - `Awaken Patch Notes and Server Updates`
  - `Awaken News System`
- Avoid introducing duplicate top-level concepts such as separate `News` and `Events` entries
- Keep the layout responsive for desktop and mobile
- Do not recreate the legacy Bootstrap offcanvas behavior with Bootstrap JavaScript

## Testing Strategy

### Backend

Because this slice is restricted to `apps/web` and `apps/api`, do not add or modify files under `apps/api.tests`.

Backend verification for this slice should rely on:

- `dotnet build apps/api`
- running the existing `dotnet test apps/api.tests` suite unchanged as a regression check
- manual API verification for:
  - category ordering
  - keyset pagination continuity
  - invalid cursor handling
  - post `404` behavior
  - sanitized iframe document output

### Frontend

Write tests first for:

- page-owned service methods calling the three `/api/v1/news/*` routes through `HttpClient`
- URL normalization when `category_id` is missing or invalid
- list pagination and `hasMoreData` behavior using the approved `items.length === pageSize` rule
- bottom sentinel loading behavior gated by `hasMoreData`
- category change clearing `post_id`
- article click updating `post_id`
- detail iframe rendering with `srcDoc`
- category-empty, list-empty, list-error, detail-error, and detail-not-found states

## Out Of Scope Follow-ups

These may be addressed later, but not in this slice:

- migrating article creation and editing into the new stack
- replacing TinyMCE or the legacy admin panel
- adding article search
- adding server-side rendered previews
- adding comments or reactions
- cleaning up legacy `liked_ips`
- introducing a dedicated patches-only content model

## Implementation Readiness

This design is ready for an implementation plan.

The slice is intentionally limited to public read APIs and one migrated `/patch` page. The legacy PHP page, legacy admin posting workflow, and existing database schema remain unchanged, so content authors can continue publishing through the current admin panel while the new stack displays the same articles safely.
