# 0061. Shelfmark Shelf (design v4) replaces the 2027 Refresh as the design source on the redesign branch

- Status: Proposed
- Date: 2026-11-23
- Source: `docs/design-next/shelf/` (brand book `design-system/README.md`, tokens `design-system/tokens.json`, component specs `design-system/components/*`, approved home page `reference/shelfmark-home-v2-final.html`, prototype `designs/01-library.html`), plan `docs/design-next/shelf/implementation-plan.md`

## Context

- The author approved a home page (`shelfmark-home-v2-final`) and a full design built from it, called Shelf: a white page, a 240px white sidebar, Hanken Grotesk, pill buttons, flat white cards with full-bleed previews, sage only for notes and AI, and an Ask button with a four-colour hover glow.
- ADR 0060 (Shelfmark Next) proposed a different direction (8px controls, no pills, Onest). Shelf keeps its graphite palette, its three jobs and its feature inventory, but takes the look of the approved reference: pills for buttons, 10 / 12 / 16 radii, Hanken Grotesk, glass round buttons over previews only.
- The work happens on the branch `redesign/shelf`, off `main`, until the author decides how it ships.

## Decision

1. On `redesign/shelf`, `docs/design-next/shelf/` is the design source of truth; `docs/design/` (2027 Refresh) is kept for reference only. CLAUDE.md on this branch points to it.
2. **Tokens.** Values come from `docs/design-next/shelf/design-system/tokens.json`. The CSS custom property names already used across `libs/ui` and `apps/web` stay and take the Shelf values; Shelf tokens with no equivalent are added under their own names (mapping in the plan). `--accent` becomes the near-black primary; sage moves to `--ai`, `--ai-bg` and `--note-text`.
3. **Type.** Hanken Grotesk 400 / 500 / 600, self-hosted from `@fontsource-variable/hanken-grotesk` (OFL), with a metric-matched local fallback; CSP `font-src 'self'` stays.
4. **Shape and elevation.** Pills for buttons, 10px rows and tabs, 12px menus and dialogs, 16px cards and the search field. Flat at rest; `shadow-hover` on a hovered card, `shadow-l2` for menus, `shadow-l3` for dialogs. No glass on floating layers; glass only for the 28px round buttons over previews.
5. **Custom theme** keeps base, accent, background and corners; the fixed themes use the graphite accent.
6. **Layout.** Desktop (≥ 64em): sidebar plus header with the search and Ask. Below 64em the existing compact shell (tab bar, top search and avatar, #316) stays.

7. **Author decisions (Nov 24, 2026): the design wins over the project rules where they disagree.**
   - The Ask button is always in the header, also while AI is off (then it turns AI on through the intro; with Ask switched off it opens Settings › AI). This overrides "nothing AI renders while AI is off" for this one entry.
   - Every account moves to the Masonry view (migration `20261223120000_default_view_masonry`, a stored `cards` or `list` included).
   - The design's values stay where they fall below WCAG 1.4.11 / 1.4.3: the off switch and slider track (`toggle-off`, about 1.4:1 light and 2:1 dark), muted text on `pick` (4.42:1 / 4.49:1) and the sage empty-state disc in dark (scene edges about 2.6:1).
   - Ukrainian is set in Onest, the Cyrillic fallback after Hanken Grotesk.

## Consequences

- Every screen changes colour, type and radius through the tokens; the home page is rebuilt to the reference first, other screens in later steps.
- `ui-button`, `ui-card`, `ui-switch`, `ui-segmented-control`, `ui-chip`, `ui-menu`, `ui-dialog`, `ui-toast`, `ui-tab-bar` and the search trigger change their look; `ui-view-menu`, `ui-range` and `ui-ask-button` are new.
- ADR 0060 stays Proposed for the parts Shelf does not cover (surfaces, phone sheets, states); where they conflict, Shelf wins on this branch.
- Nothing leaves the branch until the author decides; PROJECT.md 7 is updated when it does.
