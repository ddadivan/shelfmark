# 0059. Link preview: a sandboxed iframe, a server-side frame check and CSP `frame-src https:`

- Status: Proposed
- Date: 2026-11-21
- Source: issue #553 (design approved by the author on Nov 21, 2026: `docs/design/screens/LinkPreview.dc.html`, `LinkPreviewEntry.dc.html`, `MobileLinkPreview.dc.html`), [0019](0019-vercel-deployment-architecture.md) (CSP), [0027](0027-link-preview-images-under-csp.md) (SSRF-safe fetcher modes)

## Context

- The author wants to open a saved link without leaving Shelfmark: from 80em the library splits into a compact list and a preview panel; below 80em the preview is a pushed full-screen page.
- Showing someone else's page means framing a third-party origin inside our app. Our CSP has no `frame-src` (it falls back to `default-src 'self'`), so no foreign frame loads today.
- Many sites refuse to be framed (`X-Frame-Options: DENY | SAMEORIGIN`, CSP `frame-ancestors`). A browser gives the embedding page **no** signal for that: the frame fires `load` with an error page, and the content is cross-origin, so it cannot be inspected.
- YouTube serves a consent page to frames of `youtube.com/watch` and refuses framing for most pages; its embeddable player lives on `youtube-nocookie.com/embed/<id>`.
- A stored copy of the article (Reader, #539) would solve blocked sites, but its design is not approved yet.

## Decision

1. **Frame, not proxy.** The site loads directly from its origin in an `<iframe>`. We never fetch the page on the server and re-serve it under our origin: that would run foreign scripts on `shelfmark-app.vercel.app`, break the site's own logins and make the API an open proxy.
2. **Sandbox.** `sandbox="allow-scripts allow-same-origin allow-popups allow-forms"`:
   - `allow-scripts` + `allow-same-origin`: most pages render nothing without their scripts, and many need their own storage and cookies (consent banners, video players). This pair would be dangerous for a **same-origin** document (it could remove its own sandbox), but the framed page is always a foreign origin (only `https:` third-party URLs reach the frame), so `allow-same-origin` only gives it **its own** origin back, never ours.
   - `allow-popups`: links with `target=_blank` and "Open in YouTube" open a new tab instead of failing silently.
   - `allow-forms`: search boxes and consent forms on the site work.
   - Not granted: `allow-top-navigation*` (the page cannot navigate Shelfmark away), `allow-modals`, `allow-downloads`, `allow-pointer-lock`, `allow-popups-to-escape-sandbox`, `allow-storage-access-by-user-activation`. `allow` lists only `fullscreen; picture-in-picture; encrypted-media` for players; no camera, microphone or location.
   - `referrerpolicy="no-referrer"`: the site does not learn which Shelfmark URL (folder id, search) framed it.
3. **Only https.** `isPreviewableUrl` (contracts) accepts absolute `https:` URLs without credentials. `http:` pages cannot load inside the https app anyway (mixed content) and get the "doesn't open inside other apps" state; `javascript:`, `data:`, `blob:` and the like never reach a frame.
4. **Setting the frame address.** Angular treats `iframe[src]` as a resource URL and refuses any value not marked trusted; `DomSanitizer.bypassSecurityTrust*` is forbidden by our ESLint. `ui-preview-frame` (`libs/ui`) therefore validates the address itself (https only, no credentials) and only then sets it on its iframe element through `Renderer2`. That component is the single, tested place where a frame address is written; no feature binds `[src]` on an iframe.
5. **Videos.** `toVideoEmbedUrl` (contracts) turns YouTube `watch?v=`, `youtu.be/`, `shorts/`, `embed/` and `live/` links into `https://www.youtube-nocookie.com/embed/<id>`; only the 11-character id reaches the result. Other links show the site itself.
6. **Frame check on the server.** `POST /api/links/:id/frame-check` looks up the link by id and the session's `userId` (foreign or missing: 404), and asks the page's headers through the SSRF-safe fetcher in a new **headers mode** (`fetchHeaders`: the same URL, DNS, pinning and redirect policy as every other mode; a GET whose body is never read; short limits). `X-Frame-Options` `DENY` / `SAMEORIGIN` / `ALLOW-FROM`, or a CSP `frame-ancestors` that does not allow any https origin (`*`, `https:`, `https://*`), is `blocked`; a fetch failure is `unknown`; otherwise `allowed`. A GET was chosen over HEAD because many servers answer HEAD differently or not at all.
   - **Cache per host** in `frame_checks` (host, framing, checked_at; not user data): 7 days for allowed / blocked, 1 hour for unknown. Framing policy is a site-wide setting in practice; a per-URL cache would multiply fetches for little gain.
   - **Why POST:** a `blocked` answer adds the host to the user's `previewNewTabHosts` (below), and the API has no state-changing GETs. It is rate limited per client.
7. **The web uses the check up front, the timeout as a fallback.** The panel starts the frame check when it opens a link; `blocked` shows the empty state at once, `allowed` and `unknown` load the frame. A frame that sends no `load` within 10 s shows the same state. A frame that loads a browser error page cannot be detected (point 3 of Context); the server check covers the common case.
8. **Sites that open in a new tab.** `previewNewTabHosts` (Settings › Library, at most 100) holds hosts whose links skip the preview: the server adds a host whose check is `blocked`; "Always open <domain> in a new tab" adds one by hand; the chips remove them. With "Clicking a link: Opens the preview", a click on such a link opens a new tab directly.
9. **CSP.** `frame-src https:` is added to the HTML document policy (`libs/web/csp`) and the static policy in `vercel.json` (and `docs/SETUP.md` 5.6). `frame-ancestors 'none'` stays: nobody may frame Shelfmark. `child-src` is not set, so workers keep `worker-src`. The frames get no access to our origin (point 2), and `connect-src` / `script-src` for our own document are unchanged.
10. **Reader is deferred.** The Site / Reader switch and "Read the copy" from the approved board are not rendered until Reader (#539) has an approved design and a stored copy exists. The blocked state offers only "Open in new tab" and the checkbox.

## Consequences

- Most article sites, docs and blogs preview inline; GitHub, X, LinkedIn and banks show the blocked state and, after the first check, open in a new tab on click.
- Shelfmark's own document loses nothing: `frame-src https:` only lets frames load; it does not relax what our scripts can do. A malicious saved page can still show itself inside the frame (phishing look-alike inside the panel); the toolbar always shows its real domain next to the favicon, and the page cannot navigate the top window.
- Sites see a visit from the user's browser with their own cookies, the same as opening the link in a tab, but no referrer.
- The frame check is one outbound GET per new host per week, through the same SSRF guard as previews.
- Opening a preview records an open (`POST /api/links/:id/open`), so Recently opened stays accurate.

## Alternatives considered

- **Server-side proxy / screenshot of the page.** Rejected: runs or re-hosts foreign content under our origin (XSS and phishing surface), breaks logged-in sites, costs a headless browser per view.
- **Detecting blocked frames in the browser only** (load timing, `onerror`). Rejected as the primary signal: browsers fire `load` for blocked frames; a timeout alone is slow and unreliable. Kept as the fallback.
- **`sandbox` without `allow-same-origin`.** Safer in theory, but the site then runs in an opaque origin: no cookies or storage, broken consent banners and players, and many sites refuse to render. The page is foreign-origin, so the extra protection is small.
- **A vetted resource-URL pipe with `bypassSecurityTrustResourceUrl`.** Equivalent in effect, but it would need an ESLint exception; validating and writing the address in one `libs/ui` component keeps the lint rule absolute.
