Icons is Shelfmark's own outline set — 44 icons drawn for this product, delivered as files and one sprite (assets › Icons). Every icon is **filled outlines**: the strokes are converted to shapes, so there is no `stroke` anywhere and the colour is set only through `fill` (`fill: currentColor` by default).

**Angular:** `ui-icon` — inputs `name` (the id without `sm-`, typed as a union of the 44 names), `size: 16 | 20 | 24` (default 16), `label` (sets `role="img"` + `aria-label`; without it the icon is `aria-hidden`). Renders `<svg fill="currentColor"><use href="…/sprite.svg#sm-<name>"/></svg>`; the paths inside the sprite have no fill of their own, so the colour comes from the `fill` (or `color`) of the host. Change it with `fill: var(--accent)` or by setting `color` on the parent.

- New icons are drawn on the grid with a 1.75px stroke, round caps and joins, 3px corners, then converted to filled outlines before export (stroke to path, e.g. with picosvg or Figma “Outline stroke”). Never ship an icon with `stroke`.
- Because the line weight is baked in, icons are drawn for 16–24px; do not scale them above 32px.
- Icon-only buttons always get an `aria-label` and a tooltip.

## Added for side by side (#386)

- `columns` — a rounded rectangle (17×15, 3px corners) split by one vertical line in the middle: the "Side by side" toolbar button. Distinct from `panel-right`, whose line sits near the right edge.
- `swap` — two horizontal arrows, the top one pointing right and the bottom one pointing left (stroke source: `M4 9h15 M15 5l4 4-4 4 M20 15H5 M9 11l-4 4 4 4`): "Swap sides" between the two halves.

Both follow the rules above (1.75px line, round caps and joins, converted to filled outlines, no `stroke`).

## Added for AI (#476)

- `spark` — a four-point star with concave sides and a small plus at its lower right (stroke source: `M11 4c.6 3.9 2.6 6 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5C8.4 10 10.4 7.9 11 4z M18.5 15v4 M16.5 17h4`): the AI mark (component AiMark).

It follows the same rules (1.75px line, round caps and joins, converted to filled outlines, no `stroke`).


## Added for link kinds (#537)

- `mic` — a capsule microphone in a cradle on a short stem (stroke source: `M9 6a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0z M5 11a7 7 0 0 0 14 0 M12 18v3`): the podcast kind.
- `file` — a page with a folded top-right corner and two text lines (stroke source: `M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h6`): the document kind.
- `smartphone` — a rounded phone body with a short home bar (stroke source: a 12×20 rectangle with 3px corners, `M11 18h2`): the app kind.

They follow the same rules (1.75px line, round caps and joins, converted to filled outlines, no `stroke`). The other kinds reuse existing glyphs: video `play`, article `newspaper`, shopping `shopping-bag`, code `code`, post `message`, recipe `cooking-pot`, other `link`.
