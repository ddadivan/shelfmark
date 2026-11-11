# 0039. Paste many: one batch create without page fetches, previews from the client

- Status: Proposed
- Date: 2026-11-11
- Source: issue #265; `docs/PROJECT.md` 4 (story 3, "Paste several links"), 5.8, 6.1, 6.2; screen `PasteMany`; builds on [0027](0027-link-preview-images-under-csp.md), [0031](0031-rate-limiting-and-request-interceptors.md), [0033](0033-links-search-cursor-idempotency.md)

## Context

People paste up to 100 links at once (a list, a chat export, a note). The single create (`POST /api/links`) fetches the page when no title is sent, inside a 6 s budget, behind a 30 per minute rate limit; calling it 100 times would take minutes, burst the limit, and leave half a paste saved when one request fails. The list dialog also has to show a preview and the "Already saved" state per row before saving, and the per-user cap (10 000 links) must hold for the whole paste.

## Decision

1. **One batch endpoint.** `POST /api/links/batch` takes 1 to `LINK_LIMIT.BatchMax` (100) items (`url`, `title?`, `idempotencyKey`, `faviconUrl?`, `imageUrl?`) and one `folderId?` and `tags?` for all. Everything is saved in one transaction under the ADR 0033 lock order: `folders:` (through `FoldersService.lockTree`, which also makes the count exact and serialises retries), folder ownership (404), the cap for the whole batch (409 whose message is `Link limit reached: N more fit`, read by the client), then the tag names (`tags:` lock).
2. **No outbound fetch in the batch.** The request never fetches a page. Links are stored with their image capture pending, so the existing lazy capture (`POST /links/:id/images/capture`, ADR 0027: SSRF-safe fetcher, cooldown, its own rate limit) loads favicon and image, and replaces the title of a link saved without one, but only while the stored title is still exactly the URL fallback and the URL did not change (a title the user typed meanwhile wins; `updated_at` stays, filling in a title is not an edit).
3. **Previews come from the client.** The dialog loads each row's preview through the existing `POST /links/preview` (which also reports the duplicate), at most three at a time; a 429 stops the queue and the rest keep their address. A loaded preview's title, favicon and image source URLs travel with the item, so the server stores what the user saw. No new outbound path exists.
4. **Idempotency per item.** Each item carries its own key, generated once per dialog session; a retry replays known keys (200 when every key was replayed, 201 otherwise). Two items with the same key are a 400. The unique `(user_id, idempotency_key)` index stays the last line of defence.
5. **Skipped items, not failed batches.** An item whose normalised URL is over the column limit, or repeats an earlier item of the same batch, is skipped and listed in `errors` (`index`, `url`, `code`); the others are saved. Duplicates of links that are already saved are allowed ("save anyway"); the client unchecks them by default.
6. **Undo.** `POST /api/links/batch/delete` deletes up to 100 of the user's links by id in one statement filtered by `userId`; foreign or missing ids count as nothing (no oracle). The client takes the links out of the feed at once and puts them back if the request fails.
7. **Stricter limits.** The batch has its own rate limit (5 per minute per IP), the delete 10 per minute; DTO validation caps items, URL, title and tag lengths before the transaction opens.

## Consequences

- A paste of 100 links costs one write request plus at most 100 preview requests, which the preview rate limit (20 per minute) cuts short: rows past it show their address, the duplicate check covers only rows whose preview loaded, and the capture fills in their titles after saving.
- The capture of 100 new links shares the AddLink rate limit (30 per minute) and runs three at a time; links it did not reach keep the pending marker and are captured on a later page load. Until then they show the site letter and the URL as the title.
- A future import (Import as text, Telegram) can reuse the endpoint in chunks of 100.
- Adding a fetch to the batch later would need its own budget and must stay outside the transaction (ADR 0033, 6).
