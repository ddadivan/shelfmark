# Shelfmark design, next version: working notes

Status: in progress. The author reviews the prototype before the next step.

## The rule for this work

The new design is built from scratch on the visual-taste skills (typography, colour-palette, spacing, anti-slop, viewports and the other VectorLab UX skills) and common best practice. **The current design rules do not apply to it**: `docs/design/BRAND.md`, `docs/design/tokens.*`, `docs/design/components/*` and `docs/design/screens/*` describe the shipped 2027 Refresh and are reference for what exists, not constraints. Colours (including the sage accent), type scale, radii, elevation and where features live are all open.

What still applies, because it is about the product working and not about taste:

- accessibility: WCAG 2.2 AA contrast, keyboard, focus, 24px / 44px touch targets;
- translations: strings up to 40% longer, sentence case, no text in images;
- phone from 360px, tablet, desktop, and the browser extension popup;
- implementation limits as a starting point (components in `libs/ui`, sizes in rem, external images through an image proxy (#57), strict CSP); they can change when the product is better for it.

Code changes still follow `CLAUDE.md` (branch per issue, ADR for the decision, tests).

## Plan

How the product works is open too, not only how it looks: flows, structure and where features live are redesigned, not just restyled.

1. **Feature inventory, as is** (separate session): describe current behaviour neutrally, so nothing gets lost. Every feature with its screens, platforms, states (empty, loading, error, offline, AI off, demo) and data. Sources: `docs/PROJECT.md` section 4, `docs/design/screens/INDEX.md`, routes in `apps/web`, `docs/ai/FEATURES.md`. Commit it here as `features.md`. No judgement in this step.
2. **Flow review and new structure**: walk the key flows (save a link, find it, organise, come back to it, share, settings) with the behaviour skills (page-patterns, surfaces, forms, defaults, empty-states, errors, loaders, keyboard, verbs, labels). Output: where there are extra steps, confusion and duplicates; a new information architecture (sections, what moves, merges or goes); before / after flows for the main jobs. The author approves before step 3.
3. **Foundations**: type scale, spacing grid, radii, elevation, and 2 to 3 colour palette options with contrast checked in both themes. The author picks; recorded in an ADR.
4. **Design system**: a new Design System artifact (separate from the 2027 Refresh), every component mapped to a `libs/ui` component.
5. **Screens by group**, following the new structure from step 2, one group at a time with a review after each.
6. **Migration plan** into code.

Feature moves, merges or removals are proposed with reasons and decided by the author. Only accessibility, translations and the device range are fixed; implementation limits (CSP, image proxy, component boundaries) can change when the product is better for it.

## What exists so far

- Step 1 done: `features.md` and `screens.md` (the inventory, as is).
- Step 2 approved: `flows-and-structure.md` (three jobs, new navigation, Revisit, Reader mode, decisions D1–D15).
- Step 5, group 1 for review: `designs/01-library.html` (library, four views, Link page with Site / Reader, empty library; desktop, tablet, phone; light and dark), published privately: https://claude.ai/artifact/Np6b5Wf6vLjBbcdvUybnuv
- Step 3 approved (Graphite, smaller radii): `foundations.md` (type, space, radius, elevation, three palettes with contrast), `screen-map.md` (every page and surface of the new structure), `foundations-preview.html` (visual version, published privately: https://claude.ai/artifact/64J7giL8JyZzdFFuqsQvFL).

- `library-prototype.html`: the main page prototype built to the skills (body 16 / secondary 14 / meta 12, Major Second headings, 8pt grid, border-first elevation, no glass, one primary action), with the gaps against Raindrop closed: a preview on every card, density (about 10 cards above the fold), four views (Masonry, Grid, List, Headlines), a quiet sidebar, a simple card, less chrome. Covers are drawn stand-ins for real preview images. Light and dark, desktop and phone. Published as a private artifact: https://claude.ai/artifact/TKFcPWE8G6BKjcDptAe8bt
- An earlier canvas (desktop and phone artboards, closer to the 2027 tokens): https://claude.ai/artifact/6mFHwSXpkBsa4ieXZ2Hxb4
- `audit-and-fix-prompt.md`: the audit of `libs/ui` against the skills (type sizes outside the scale, about 50 hard-coded radii, off-grid spacing, the undefined `--space-5`, glass on cards, a glow gradient, loud sage fills, too many primary buttons) and a fix prompt. It was written against the 2027 rules; with the rule above, its findings stand but the target values come from the new foundations.
- Branch `ccr-64889676-li4al2`, commit "quiet down sage fills, extra primaries and the Ask fill": a first colour clean-up in the app (card placeholders, extension banner, demo banner, active saved view, Ask button).

## Gaps against Raindrop (design only)

1. Real previews on cards: needs the image proxy (#57); the biggest gap.
2. Density: less chrome above the feed, shorter cards.
3. View modes: Masonry and Headlines missing.
4. Sidebar noise: coloured row fills, sage tag chips, accent counts.
5. Card noise: seven or eight small elements per card.
6. Header chrome: theme and shortcuts buttons in the top bar.

Features (full-text search, highlights, public collections, native apps) were not compared yet.
