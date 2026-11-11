# 0038. Link kind derived at save time, saved views as JSON queries with starter views from a trigger

- Status: Accepted
- Date: 2026-11-11
- Source: issue #264; author decisions of Nov 10, 2026 (PROJECT.md Status); screens `Main`, `RecentView`, component `SavedView`; builds on [0033](0033-links-search-cursor-idempotency.md), [0036](0036-trash-soft-delete.md), [0037](0037-folder-style-and-pins.md)

## Context

Chips above the feed ("All 12", "Videos 5", "Articles 4", "To read 3", "+ Save this view") filter the library by saved queries, and the same kind chips filter Recently opened. "Videos" and "Articles" need to know what a link points to, which the data model did not record. Views need counts, must survive a folder going to Trash and must stay cheap to list.

## Decision

1. **`links.kind`** (`varchar(16)`, default `other`, CHECK in `video | article | shopping | other`, contract `LINK_KIND`). It is derived by the pure `deriveLinkKind(url, ogType?)` in `@shelfmark/contracts` (shared by the API and the web mock): `og:type` first (`video` / `video.*` video, `article`, `product` / `product.*` / `og:product` shopping), then the host lists `LINK_KIND_VIDEO_HOSTS` (YouTube, youtu.be, Vimeo, Twitch, Dailymotion, TikTok, Loom) and `LINK_KIND_SHOP_HOSTS` (Amazon, eBay, Etsy, AliExpress, Zalando, IKEA, Walmart, Best Buy), a subdomain matching too, else `other`.
   - **Save time.** `extractPreview` reads `og:type`; `LinkPreview.kind` carries the result (the fallback preview uses the host). The client sends it back as `CreateLinkRequest.kind` when it had a fetched preview; without it the server uses the page it fetched (no `title`) or else the host. The server never fetches a page just for the kind.
   - **URL change.** A `PATCH` that changes the normalized URL recomputes the kind from the new host (no fetch: PATCH stays fast), unless the same request sets `kind`. The same URL written differently keeps it.
   - **User choice.** `PATCH {kind}` (the "Type" select of the edit dialog) overrides it.
   - **Backfill.** The migration applies the host rules in SQL (the host is cut from `url` with a regular expression); `og:type` of saved rows is unknown and nothing is fetched, so old article pages stay `other` until edited. The SQL lists duplicate the contract lists (two places, the comment on each says so).
   - **Filter.** `GET /api/links?kind=` (one value: every chip is one kind, a combination has no UI) and `GET /api/export?kind=`; `LinkResponse.kind` and `ExportLink.kind`. Index `(user_id, kind)`.
2. **`saved_views`** table: `id`, `user_id` (cascade), `name` (`varchar(40)`), `query` (`jsonb`), `position` (`smallint`, CHECK >= 0), timestamps. The query is the normalized `SavedViewQuery` `{scope, folderId, tags, kind, sort, order, q}` (scope `all | unsorted | favorites | folder`). It is JSON rather than columns because it is only ever read whole and its shape follows the list filters; the strict DTO (`forbidNonWhitelisted`, nested validation, at most 5 tags, `q` at most 200, control characters refused, `folderId` exactly with the folder scope) is what keeps it clean, and the read path parses it defensively (`parseStoredQuery`: a malformed field becomes its default, never a 500).
3. **Limits and writes.** At most `SAVED_VIEW_LIMIT.PerUserMax` (20) views per user, name 1–40 characters (trimmed). Create, update and reorder run under a per-user advisory lock `views:<userId>` that is never taken together with another lock (so the lock order of ADR 0033 is untouched); a new view goes to `max(position) + 1`; reorder takes every id exactly once (else 400) and rewrites 0..n-1; delete leaves gaps, which the order ignores. Writes are rate-limited (`RATE_LIMIT.ViewWrite`, 30 per minute) and covered by the global `CsrfGuard`. A foreign or missing view is 404.
4. **Folder views and Trash.** A folder view must name one of the user's live folders when it is written (404 otherwise, the same answer for foreign, missing and trashed). When that folder later goes to Trash or is deleted for good the view stays, with `available: false` and `count: 0`; the client refuses to apply it with a toast, and a restore makes it available again. No cleanup on any delete path is needed, and a restore brings the view back with its folder.
5. **Counts in one grouped query.** `GET /api/views` answers the views with `count` and the `total` of live links (the "All" chip). One SQL statement over the user's live links (`deleted_at IS NULL`) computes `COUNT(*) FILTER (WHERE …)` per view (`viewCondition`, the SQL twin of `buildLinkWhere`: same scope, kind, tag AND (escaped `ILIKE`) and search-word AND (escaped `ILIKE` over title, note and URL) rules), built with `Prisma.sql` fragments, so every value is a bound parameter. An integration test compares every count with the list endpoint.
6. **"All" is not a stored view** but the fixed first chip (not deletable, renamable or movable, not counted in the limit); it resets the feed to all links and is pressed when nothing is narrowed. **Starter views** "Videos" and "Articles" are rows, created by a database trigger `AFTER INSERT ON users` (and inserted for existing users by the migration): every way a user row appears (OAuth sign-up, demo) gets them, no request has to create them, and `GET` never writes (the "no state-changing GET" rule). Deleting them is final; nothing re-creates them.
7. **Client.** `ui-saved-views` (Angular Aria toolbar, toggle buttons, a "…" menu per view, dashed add button) is presentational; the library page passes its filter, the active chip is the view whose query equals it. Applying a view goes through the router (scope route plus `?tag=&q=&kind=&sort=`), so the URL stays the single source of the filter. Save waits for the server in its dialog; rename, delete and move (the keyboard alternative to dragging) are optimistic with rollback and toasts. Counts are re-read when the library counts change. Recently opened filters the loaded history by kind on the client.

## Consequences

- A link saved before #264 on an article site is `other` until the user edits its kind or URL; only video and shop hosts were backfilled.
- The host lists are code: adding a host is a contract change plus, for old rows, a new data migration.
- The trigger is invisible to Prisma (no drift, `db-check` does not see it); it is documented here and in `schema.prisma`, and the migration test checks it.
- A sort the feed has no option for (title descending through the API) applies as the nearest feed sort, and the view is then not shown as pressed.
- `available: false` views still count against the limit.

## Alternatives considered

- **Columns per filter** instead of `jsonb` - a migration for every new filter, for data that is only read whole.
- **Starter views lazily on the first `GET`** - a write on a `GET` route, and a "seeded" flag so that deleting them does not bring them back.
- **Per-view `count` queries** - up to 21 round trips per list instead of one statement.
- **Deleting folder views when the folder goes to Trash** - loses the view on a mistaken delete that Trash exists to undo.
- **Fetching the page on `PATCH` to re-read `og:type`** - makes every URL edit as slow as a preview; the host is enough there and the user can set the kind.
