Icons is Shelfmark's own outline set — 44 icons drawn for this product, delivered as files and one sprite (assets › Icons). Every icon is **filled outlines**: the strokes are converted to shapes, so there is no `stroke` anywhere and the colour is set only through `fill` (`fill: currentColor` by default).

**Angular:** `ui-icon` — inputs `name` (the id without `sm-`, typed as a union of the 44 names), `size: 16 | 20 | 24` (default 16), `label` (sets `role="img"` + `aria-label`; without it the icon is `aria-hidden`). Renders `<svg fill="currentColor"><use href="…/sprite.svg#sm-<name>"/></svg>`; the paths inside the sprite have no fill of their own, so the colour comes from the `fill` (or `color`) of the host. Change it with `fill: var(--accent)` or by setting `color` on the parent.

- New icons are drawn on the grid with a 1.75px stroke, round caps and joins, 3px corners, then converted to filled outlines before export (stroke to path, e.g. with picosvg or Figma “Outline stroke”). Never ship an icon with `stroke`.
- Because the line weight is baked in, icons are drawn for 16–24px; do not scale them above 32px.
- Icon-only buttons always get an `aria-label` and a tooltip.
