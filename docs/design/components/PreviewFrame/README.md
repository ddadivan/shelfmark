PreviewFrame shows a third-party page inside the app, for the preview panel of a saved link (#553).

**Angular:** `ui-preview-frame` — inputs `src` (required), `title` (required, the accessible name of the iframe), `timeoutMs` (default 10000, 0 turns it off); outputs `loaded`, `timedOut`, `rejected`. It fills its container; the owner sizes it.

**Look:** the page sits on `--frame-canvas`, white in both themes: a site is drawn for a white page and keeps its own look in the dark theme. The `ui-progress-bar` (inline) runs along the top edge until the page loads, then fills and fades. Nothing else of the app is drawn over the page.

**Behaviour:**

- Loading starts when `src` is set and restarts when it changes. `loaded` emits when the page fires `load`; `timedOut` emits once when `timeoutMs` pass without it (the page may still arrive, then `loaded` follows).
- Security (ADR 0059): only an absolute `https:` URL without username or password and not on the app's own origin is accepted. The component is the single vetted place where a URL reaches an iframe `src` (written with `Renderer2` after validation; there is no `src` binding and no `bypassSecurityTrust*`). A refused `src` never touches the iframe: the frame is hidden and blank, `rejected` emits at once (instead of `timedOut`).
- The iframe is sandboxed (`allow-scripts allow-same-origin allow-popups allow-forms`), sends no referrer, loads eagerly and may use only `fullscreen`, `picture-in-picture` and `encrypted-media` (no camera, microphone or location).
- The host carries no `title` attribute (it would put a native tooltip over the page); the name is on the iframe.
- A site that forbids framing (`X-Frame-Options`, `frame-ancestors`) cannot be detected from inside the page; the feature decides that before showing the frame (and uses `timedOut` as the fallback).
