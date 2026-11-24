# ReaderView
An article as clean text inside the Link page (Site / Reader switch).

**Anatomy:** 2px progress line · site with favicon · title (`display` in the reading font; `title-l` on phones) · author, date, reading time (`secondary`, muted) · AI summary box (hairline, spark) · text in `reader-body` at the measure width: headings (`reader-heading`), paragraphs, quotes, lists, figures with captions.

**Reading settings** (the Aa button; a 320px popover on desktop, a bottom sheet titled "Reading settings" on phones). Changes apply at once and are saved on this device:
- **Theme:** four `Aa` tiles, Light, Sepia, Dark, Black. Fixed palettes (`reader-*` tokens), independent of the app theme; until the person picks one, Reader follows the app (Light or Dark). Selected tile: 2px `text` ring with a 2px `surface` gap.
- **Font:** Sans (Hanken Grotesk), Serif (Literata), Readable (Atkinson Hyperlegible). Each label is set in its own font.
- **Text size:** A, slider 14 to 24px in 1px steps, A, value. Default 18 (`reader-body`). The A buttons step by 1.
- **Line spacing:** Compact 1.45, Normal 1.6, Relaxed 1.8.
- **Line width:** Narrow 60ch, Normal 68ch, Wide 84ch.
- Footer: "Saved on this device" and a ghost Reset (back to the defaults).
Segmented controls fill the width with equal segments.

**Full screen** (desktop and tablet, button after Details, key F; Esc leaves full screen first, then closes):
- The Link page covers the whole window: no sidebar, header or link list.
- The head stays: previous / next (↑ ↓), title and site, "3 of 17" position in the current feed, Site / Reader, Aa, Open, star, details, ⋯, exit full screen, close.
- Works for Site and Reader, so people can run through their links or read one without distraction. Full screen is remembered while stepping through links and ends when the Link page closes.
- Phones: the Link page is already full screen, so there is no button.

**Head controls:** the full screen button has a `surface-hover` fill and `radius-xs` (4px), hover `surface-pressed`; the Site / Reader switch is a 6px track with 2px padding and 4px segments (28px tall). Both only in the Link page head.

**Phone head:** two rows. Row 1: title and site, ⋯, close. Row 2: Site / Reader, Aa, Open (icon), then previous / next on the right. Star and details move into ⋯.

## Rules
- Text arrives as typed blocks from the server and renders with components, never as HTML.
- When a site can't be shown inside the app, the Link page opens Reader with one muted line explaining why.

## In code
New: `ui-reader` (blocks), Link page.
