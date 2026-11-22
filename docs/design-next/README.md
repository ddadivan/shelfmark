# Shelfmark design, next version: working notes

Status: in progress. The author reviews the prototype before the next step.

## The rule for this work

The new design is built from scratch on the visual-taste skills (typography, colour-palette, spacing, anti-slop, viewports and the other VectorLab UX skills) and common best practice. **The current design rules do not apply to it**: `docs/design/BRAND.md`, `docs/design/tokens.*`, `docs/design/components/*` and `docs/design/screens/*` describe the shipped 2027 Refresh and are reference for what exists, not constraints. Colours (including the sage accent), type scale, radii, elevation and where features live are all open.

What still applies, because it is about the product working and not about taste:

- accessibility: WCAG 2.2 AA contrast, keyboard, focus, 24px / 44px touch targets;
- translations: strings up to 40% longer, sentence case, no text in images;
- phone from 360px, tablet, desktop, and the browser extension popup;
- implementation limits: components land in `libs/ui`, sizes in rem, external images only through an image proxy (#57), strict CSP.

Code changes still follow `CLAUDE.md` (branch per issue, ADR for the decision, tests).

## Plan

1. **Feature inventory** (separate session): every feature with its screens, platforms, states (empty, loading, error, offline, AI off, demo) and data. Sources: `docs/PROJECT.md` section 4, `docs/design/screens/INDEX.md`, routes in `apps/web`, `docs/ai/FEATURES.md`. Commit it here as `features.md`.
2. **Foundations**: type scale, spacing grid, radii, elevation, and 2 to 3 colour palette options with contrast checked in both themes. The author picks; recorded in an ADR.
3. **Design system**: a new Design System artifact (separate from the 2027 Refresh), every component mapped to a `libs/ui` component.
4. **Screens by group**, one group at a time with a review after each. Draft groups: Library (feed, views, preview), Capture (add link, extension, import), Organise (folders, tags, pins, rules, bulk), Find (search, Ask / AI), Come back (recent, reminders, forgotten), Shared collections, Settings and account, Sign-in / onboarding / landing, System states.
5. Feature moves, merges or removals are proposed with reasons and decided by the author.
6. Migration plan into code.

## What exists so far

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
