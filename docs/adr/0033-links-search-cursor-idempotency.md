# 0033. Links API: search, keyset cursor, idempotent create and lock order

- Status: Proposed
- Date: 2026-11-07
- Source: issue #72; `docs/PROJECT.md` 5.3, 5.8, 6.1, 6.2; builds on [0027](0027-link-preview-images-under-csp.md), [0029](0029-global-session-guard-and-isolation-harness.md), [0031](0031-rate-limiting-and-request-interceptors.md)

## Context

The links API has to search titles, notes and URLs, page through up to 10 000 links per user in two sort orders, tolerate retries of a slow create (the timeout interceptor answers 504 for work that may have succeeded, ADR 0031), and run next to folders and tags endpoints that change the same rows (move, delete, merge).

## Decision

1. **Search.** `q` is split on whitespace into at most `LINK_LIMIT.QueryTermsMax` (5) words, the rest is ignored. Every word must match (AND) at least one of title, note or URL with an escaped `ILIKE '%word%'` (`%`, `_` and `\` are escaped, the escape character is `\`). Prisma `contains` with `mode: 'insensitive'` binds `%` + value + `%` as a parameter without escaping wildcards, so the where-builder escapes the word itself (`escapeLike`); PostgreSQL's default `LIKE` escape is the backslash. No raw SQL is involved. GIN trigram indexes on `title` (existing), `note` and `url` serve the `ILIKE` scans.
2. **Filters.** `folderId` means the direct children of that folder (the export, #146, covers the subtree); `unsorted`, `favorite` and `tag` combine with AND. `folderId` together with `unsorted` is a 400. Every query carries `userId` from the session.
3. **Keyset cursor.** Sort by `createdAt` or by `title_sort_key` (stored `lower(title)`, backfilled by the migration, kept in sync by the service), always with `id` as the tie-breaker. The cursor is an opaque base64url JSON `{v, s, o, k, id}`: version, sort field, order, last sort key and last id. A cursor whose version, sort or order does not match the request, or that is malformed, is a 400. The page is fetched with `limit + 1` rows; the extra row only decides `nextCursor`. The cursor is at most `PAGE_LIMIT.CursorMax` (2048) characters. A cursor is not signed: it only carries values the client could filter on anyway, and every query is scoped to the session user.
4. **Idempotent create.** The client sends `idempotencyKey` (UUID, one per dialog session). A request with a known key first looks the link up (before any page fetch, so a retry never fetches again), and looks it up again inside the create transaction after the folder lock, which serializes two parallel requests with the same key: the second one finds the first one's link and answers 200. The unique index on `(user_id, idempotency_key)` is the last line of defence: a `P2002` (only reachable if the lock is ever bypassed) is caught and answered with the existing link. The index is per user, so a key of another user never matches and nothing leaks. Duplicate URLs stay allowed (PROJECT.md 6.1); only the key deduplicates.
5. **Per-user cap.** `LINK_LIMIT.PerUserMax` (10 000) links; the count runs inside the create transaction under the folder lock and returns 409.
6. **Preview and create.** Before any fetch, create runs cheap unlocked checks (folder ownership, per-user cap) so a request that must fail never costs up to 6 s of fetching; the locked checks in the transaction stay authoritative. The server fetches the page only for `POST /links/preview` and for `POST /links` when `title` is absent, always outside a database transaction, through the SSRF-safe fetcher with a 6 s budget. Any fetch failure gives the same fallback (title = URL, `fetched: false`), so the endpoint is not an oracle for internal hosts. Images and favicons are stored by #149 (ADR 0027); until then only the source URLs are stored and `faviconUrl` / `imageUrl` in responses are `null`.
7. **Global lock order.** Transactions that need more than one advisory lock take them in this order: `folders:<userId>` first, then `tags:<userId>`. Link create and update take the folder lock (through `FoldersService.lockTree`, which also serialises against folder moves and deletes) and then resolve tag names (tag lock). Tag merge and delete take only the tag lock. Any new code that needs both follows the same order, which rules out deadlocks.

## Consequences

- **Control characters.** NUL and other C0/DEL characters are a 400 in `q`, titles, tags, URLs and the cursor key (notes may keep tab, LF and CR). PostgreSQL rejects NUL in text, which would otherwise be a 500. Titles taken from a fetched page are cleaned instead of rejected.
- **Case-insensitive name matching is escaped too.** Prisma emits `ILIKE` for `equals` with `mode: 'insensitive'`, so tag names go through `escapeLike` as well (otherwise the tag `a_b` matched `axb`).
- **Rolling deploys.** `title_sort_key` is `NOT NULL` without a default: the migration backfills it, and the new code always writes it. The previous release (which does not know the column) would fail its link inserts during the short window between the migration and the new code going live. There is no link-creating release before this one in production, so the window is empty today; once links are live, a column added like this needs a default in an expand step first.
- **Indexes.** `(user_id, created_at, id)` replaces `(user_id, created_at)` (same prefix, plus the cursor tie-breaker); `(user_id, title_sort_key, id)` serves the title sort.
- No offset paging and no total count; the web app shows "load more".
- Changing the title must rewrite `title_sort_key` in the same statement.
- Trigram indexes cost write time and storage; at the 10 000-link cap this is small.
- A cursor format change bumps `v`; old cursors then get a 400 and the client restarts the list.
- The idempotency key is only a retry guard: it does not make PATCH or DELETE idempotent beyond their natural semantics.

## Alternatives considered

- **Offset paging** — unstable under concurrent inserts and slow for deep pages.
- **Full-text search (`tsvector`)** — stems and tokenises words, which is wrong for URLs and partial words; trigram `ILIKE` matches what users type.
- **Deduplicating by URL** — contradicts "save anyway" (PROJECT.md story 5).
- **Server-side idempotency from request hashing** — needs a store and a TTL; a client-generated key is simpler.
