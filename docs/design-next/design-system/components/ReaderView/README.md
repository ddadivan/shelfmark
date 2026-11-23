# ReaderView
An article as clean text inside the Link page (Site / Reader switch).

**Anatomy:** 2px progress line · site with favicon · title (`display` in the reading font; `title-l` on phones) · author, date, reading time (`secondary`, muted) · AI summary box (hairline, spark) · text in `reader-body` at the `measure` width: headings (`reader-heading`), paragraphs, quotes, lists, figures with captions.
**Reading settings** (popover): size S / M / L, font Sans / Serif / Readable, width narrow / wide, page like the app or sepia.

## Rules
- Text arrives as typed blocks from the server and renders with components, never as HTML.
- When a site can't be shown inside the app, the Link page opens Reader with one muted line explaining why.

## In code
New: `ui-reader` (blocks), Link page.
