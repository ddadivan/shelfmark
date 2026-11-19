# 0056. Import: the file is parsed in the browser, normalized rows go to the API in small batches, an `imports` row records what each import created, Undo moves exactly that to Trash

- Status: Proposed
- Date: 2026-11-19
- Source: issue #387, `docs/design/screens/Import.dc.html`, `SetImport.dc.html`, `docs/PROJECT.md` 5.5 and 5.8; builds on [0033](0033-links-search-cursor-idempotency.md) (idempotent batch create), [0036](0036-trash-soft-delete.md) (Trash) and [0027](0027-link-preview-images-under-csp.md) (lazy, SSRF-safe image capture)

## Context

- People move in from other tools with a file: browser bookmarks (the Netscape bookmark HTML of Chrome, Firefox, Safari and Edge) first; Pocket, Raindrop.io, the Shelfmark JSON backup and a plain list of URLs follow through the same seam.
- A bookmark file can hold thousands of links and, from Chrome, an inline base64 icon per link (tens of MB). The API runs as one Vercel Function (Hobby, 300 s default duration, `REQUEST_TIMEOUT_MS` below it), behind a global 100 kb JSON body limit.
- The file is untrusted HTML. Nothing from it may ever be rendered as HTML (PROJECT.md 5.8).
- Paste many (#265) already saves up to `LINK_LIMIT.BatchMax` links in one transaction with per-item idempotency keys, the per-user cap and no page fetch; the images and page titles come later through the lazy capture of ADR 0027 (the SSRF-safe fetcher).
- The design promises a review before anything is written (counts, duplicates, target folder, keep or flatten), progress, a summary and **Undo import** that removes exactly what the import created, for 7 days.

## Decision

1. **Parsing in the browser.** The web app reads the file (at most `IMPORT_LIMIT.FileBytesMax`, 50 MB) with `DOMParser` into a detached document that is never attached, and walks it as data: `<DT><H3>` is a folder, `<DT><A HREF>` a link (title from `textContent`, `ADD_DATE` as the date added, Firefox's `TAGS` as tags), `<DD>` the note. Only http(s) URLs are kept (`javascript:`, `place:`, `chrome:`, `file:` and data URLs are counted as skipped). Browser root folders ("Bookmarks bar", "Other bookmarks", Firefox's "Bookmarks Menu") are kept as folders. At most `IMPORT_LIMIT.LinksMax` (10,000 = `LINK_LIMIT.PerUserMax`) links and `IMPORT_LIMIT.FoldersMax` folders; deeper folders than `IMPORT_LIMIT.DepthMax` join their deepest allowed ancestor. The file never reaches the server, so the body limit and the function duration only see small JSON requests.
2. **A source seam.** `ImportSource` (web, `features/import/`) = id, label keys, accepted file types and `parse(file) → ParsedImport` (folders as a tree of keys, links with url, title, folder key, tags, note, date added). Browser bookmarks is the only source today; a new source is one more entry, one parser with fixtures and translations. The API contract carries the source id (`IMPORT_SOURCE`, additive).
3. **Review without writes.** Duplicates inside the file are found in the browser with the shared `normalizeUrl`. Duplicates already saved come from `POST /api/imports/check` (`{ urls }`, at most `IMPORT_LIMIT.CheckBatchMax` per call, chunked by count and about 80 kb; answers the indexes whose normalised URL matches one of the user's live links; read-only). "Skip duplicates" drops both kinds before sending; unchecked, every row is sent.
4. **Start, batches, finish.**
   - `POST /api/imports` creates the `imports` row (source, file name, keep structure) and, in the same transaction under the `folders:` lock, the target folder (a new folder with the name the client chose, or a live own folder, or none = Unsorted) and, with "Keep the folder structure", the file's folders under it; the folder cap counts them before anything is written (409 with nothing written). It answers the import id and a map from folder key to folder id.
   - `POST /api/imports/:id/links` saves one batch (at most `LINK_LIMIT.BatchMax` items and, on the client, about 80 kb) through the paste many path of `LinksBatchService` with the import id: same transaction, locks, cap, idempotency keys (a retried batch replays), rules off (the file decides folders), the date added as `created_at` (clamped to the past and to 1990 or later). Created links, and the tags the batch created, get `import_id`. It answers counts and the per-item errors, not the links. A batch that fails is reported and the next one runs: the summary counts its rows as failed.
   - `POST /api/imports/:id/finish` stores the client's skipped and failed counts for "Recent imports". The client sends batches one after another, so the run needs no server-side job or queue; a closed tab stops after the last committed batch, which the summary of "Recent imports" shows.
   - Batches are accepted only for the session user's own import, not undone, within `IMPORT_LIMIT.OpenHours` of its start. Rate limit `RATE_LIMIT.ImportBatch` (enough for 100 batches a minute); start, check and undo have their own stricter limits.
5. **What an import created is recorded on the rows.** New nullable `import_id` columns on `links`, `folders` and `tags` (foreign key to `imports`, `ON DELETE SET NULL`, partial indexes). A tag gets it only when this import's batch created it (looked up under the `tags:` lock before `resolveNames`).
6. **Undo through Trash.** `POST /api/imports/:id/undo`, within `IMPORT_LIMIT.UndoDays` (7) and once: under `folders:` then `tags:`, one shared `deleted_at` for the import's live links and folders (so Trash shows the import's top folder as one entry and restores it whole); links the user added to an import folder later move to Unsorted and the user's own subfolders move to the top level first, so nothing the import did not create goes to Trash; pins are cleared; tags the import created are deleted when no link outside this import carries them (a link restored from Trash later comes back without such a tag). `imports.undone_at` is set. `GET /api/imports` lists the user's imports of the last 7 days that are not undone (Account › Your data, "Recent imports").
7. **Previews in the background.** Import saves never fetch a page. Imported links keep their bookmark title; favicons and preview images come through the lazy capture of ADR 0027 when the cards are shown, through `SafeFetcherService` with its rate limit, as for paste many.
8. **Demo.** Import is allowed in a demo sandbox; the demo link cap (`DEMO_LIMIT.MaxLinks`) applies to every batch, and the review says how many fit. No separate demo path.

## Consequences

- The server never parses HTML from the file and never holds it; the client parser is the only place that reads it and has its own fixtures (real Chrome and Firefox exports).
- A 10,000-link import is about 100 short requests; each is one transaction well inside the function limits, and a failure loses one batch at most.
- Undo is exact even after edits: what the import created is on the rows, not in a list the client holds. Moving an imported link elsewhere does not save it from Undo; the confirmation says so.
- Three tables gain a nullable column and a partial index; the export and every read ignore it.
- The other sources of #387 add a parser and translations only, unless they bring data the batch contract lacks (favorites, notes are already in it).

## Alternatives considered

- **Upload the file and parse it on the API** — one request, but the body limit (and the 4.5 MB of older plans) needs a special parser route, a long or background job, and the server would parse untrusted HTML; progress would need polling.
- **One request per link** — simple, but 10,000 requests, the rate limits and no transaction per batch.
- **Undo from a client-held list of created ids** — no schema change, but lost with the tab and unbounded in size; `import_id` on the rows survives and is exact.
- **Hard delete on Undo** — faster, but every other delete in Shelfmark goes through Trash.
