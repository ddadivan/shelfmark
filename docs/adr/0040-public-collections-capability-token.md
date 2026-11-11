# 0040. Public collections: a stored capability token per shared folder

- Status: Proposed
- Date: 2026-11-11
- Source: issue #276; author decisions of Nov 10, 2026; `docs/PROJECT.md` 4 (story 25), 5.8, 6.1, 6.2; builds on [0019](0019-vercel-deployment-architecture.md), [0027](0027-link-preview-images-under-csp.md), [0029](0029-global-session-guard-and-isolation-harness.md), [0031](0031-rate-limiting-and-request-interceptors.md)

## Context

A user shares one folder (with its subfolders) as a read-only public page that anyone with the link can open, without an account. The author decided: public link only (no invites, roles, "Shared with me" or "Save to my shelf"); "Show my notes" off by default; "Reset link"; `noindex`; an unguessable token of at least 128 bits; rate limits; at most 10 public folders per user; at most 500 links on a page, paginated; demo users cannot share. Every API route is closed by default (ADR 0029), so the page needs reviewed entries in `PUBLIC_ROUTES`. Images are captured copies served same-origin under `img-src 'self' data:` (ADR 0027); the existing image routes need a session.

The link is a capability URL: whoever has it can read the collection. The share dialog must show "Copy link" every time it opens, not only right after the link was created.

## Decision

- **Table `folder_shares`** (`FolderShare`): `id`, `user_id`, `folder_id` (unique), `token` (`varchar(22)`, unique), `show_notes` (default `false`), `token_created_at`, `created_at`, `updated_at`. A composite FK `(folder_id, user_id) → folders(id, user_id)` with `ON DELETE CASCADE` keeps the share on a folder of the same user and removes it with the folder or the account. A `CHECK` pins the token to `^[A-Za-z0-9_-]{22}$`. A row exists exactly while the folder is shared: disabling deletes it, so a disabled or reset token can never come back.
- **Token:** 16 bytes from `crypto.randomBytes` as unpadded base64url, 22 characters, 128 bits (`generateShareToken`). **Stored as is**, not hashed: the owner must be able to copy the link again, and a hash would force "show once" UX for a link the owner hands out on purpose. The risk a hash would cover (a database read leaks live links) is bounded: a leaked token exposes only what the owner already published, the owner can reset it, and the database already holds the links themselves. Collisions (2⁻¹²⁸ per pair) are retried up to three times on the unique index. The token is never logged.
- **Owner routes** (session, global `CsrfGuard`, `userId` from the session, foreign or missing folder is the folders 404): `GET /api/folders/:id/share` (state, `enabled: false` when not shared), `POST /api/folders/:id/share` (enable, idempotent, 200; 403 for demo users; 409 at 10 per user; takes the `folders:` tree lock so the cap cannot be raced), `PATCH /api/folders/:id/share` `{ showNotes }`, `POST /api/folders/:id/share/reset` (new token), `DELETE /api/folders/:id/share` (204, idempotent). Enable and reset use `RATE_LIMIT.Share` (20 a minute).
- **Public routes** (`@AllowAnonymous()`, listed in `PUBLIC_ROUTES`, no session lookup): `GET /api/public/collections/:token` (`RATE_LIMIT.PublicCollection`, 30 a minute per IP) and `GET /api/public/collections/:token/links/:linkId/favicon|image` (`RATE_LIMIT.PublicCollectionImage`, 240 a minute per IP). A token of the wrong shape is refused before any query; otherwise one `findUnique` on the token index decides. Unknown, malformed, disabled and reset tokens, a `folder` filter outside the subtree, and an image of a link outside it are all the same `404 { message: 'Collection not found' }`. Responses carry `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store` (so a disabled link stops at once, also in shared caches); the images keep the ADR 0027 headers (`private`, immutable, `nosniff`, CORP same-origin) plus `X-Robots-Tag`.
- **What the page exposes:** the owner's first name only, the folder name, the link count of the subtree, the latest change time, the direct subfolders (id, name, subtree count) for the filter chips, and per link `id`, `url`, `title`, `note` (only with "Show my notes") and same-origin image paths keyed by the token. Never the email, user id, tags, favorites, opens, folders above the shared one or another user's rows. Links are read with `userId` of the share and `folderId IN (subtree)`, the subtree by a recursive query restricted to the same user. Newest first, 50 per page (`page` 1–10), at most 500 links.
- **Web:** `/c/:token` outside the app shell and without a guard; the page sets `<meta name="robots" content="noindex">`, and `vercel.json` adds `X-Robots-Tag: noindex, nofollow` for `/c/*`. The CSP does not change.

## Consequences

- A database leak exposes live share links (reset fixes one); acceptable for content the owner published.
- Two more anonymous surfaces, each one indexed read per request and rate-limited; the scanner and the allow-list document them.
- Moving a link or folder out of the shared subtree removes it from the page at once; deleting the folder ends the link.
- No expiry, view counts or audit of opens: none was asked for. "Report this collection" is not built: the feedback API on this base is the milestone rating only (no free-form channel), and the author preferred omitting it over a new endpoint.
- Revisit for invites and roles (backlog): those need per-person grants, not a bearer token.

## Alternatives considered

- **Columns on `folders`** (`share_token`, `share_show_notes`): fewer joins, but a nullable unique column on every folder and the settings outlive a disable; a separate row makes "disabled" mean "gone".
- **Hash of the token (SHA-256) with show-once UX:** protects against a database read, but the owner could not copy the link again without a reset; rejected for the reason above.
- **Signed tokens (HMAC of folder id):** cannot be revoked one by one without a stored nonce, which is a stored token again.
- **Sequential or UUIDv7 ids in the URL:** v7 carries a timestamp and fewer random bits; not a capability.
- **Offset-free cursor pagination:** the 500-link cap makes an offset over `(created_at, id)` cheap and simple; a cursor would add a format for at most ten pages.
