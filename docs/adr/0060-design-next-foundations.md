# 0060. Shelfmark Next: a new design system built from the visual-taste skills, replacing the 2027 Refresh tokens and components

- Status: Proposed
- Date: 2026-11-23
- Source: `docs/design-next/` (flows and structure with the author's answers D1–D15, foundations approved by the author, screen map, design system "Shelfmark Next", screen designs groups 1–7), migration plan `docs/design-next/migration-plan.md`

## Context

- `libs/ui` and the 2027 Refresh (`docs/design/`) were audited against the visual-taste skills (typography, colour-palette, spacing, anti-slop, surfaces, page-patterns, viewports). Findings: too many type sizes and weights, text below 12px, radii 8 / 14 / 22 / 28 with pill controls, glass on floating layers, the sage accent on many fills (far above 10% of the screen), several patterns for one action (rename as dialog, inline and dialog), dialogs stacked on dialogs.
- A comparison with Raindrop showed gaps in density, card information (description, note), search and the phone layout.
- The author decided that the new design follows the skills and common best practice, **not** the current project design rules, and that product behaviour may change too, not only the look.
- A feature inventory (334 features, 174 screens) was written first, so the redesign moves every feature somewhere instead of losing it.

## Decision

1. **Spine: three jobs.** Save, Find, Come back. Navigation and pages follow them (D1): Library, Revisit (reminders, continue reading, forgotten, recently opened; D2), search plus Ask in one field, a Tidy up page for everything that needs a decision.
2. **Type.** One family (Onest), JetBrains Mono only for addresses and keyboard caps. 16 body, 14 secondary, 12 meta (only metadata), headings on Major Second (1.125). Weights 400 / 500 / 600 only. Unitless line-height. Nothing below 12px.
3. **Space.** 8pt grid, 4pt for micro gaps: 4, 8, 12, 16, 24, 32, 48, 64.
4. **Radius.** 4 / 8 / 12 / 16 / full, concentric. Controls (buttons, inputs, search, chips, rows) are 8px rounded rectangles, not pills. Cards, menus, popovers, toasts 12; sidebar, dialogs, slide-overs, tab bar 16; full only for round things. The Custom theme no longer changes radii (D7).
5. **Elevation.** Border first, then a soft shadow (alpha ≤ 0.07 in light); dark mode uses borders and an inset top highlight. No glass, no gradients. Three levels: L1 surfaces, L2 floating (menus, popovers, tab bar), L3 dialogs and slide-overs with a scrim.
6. **Colour.** Graphite palette: neutral canvas and surfaces, near-black accent, within 60-30-10. Ink and Sage stay as accent options in Settings › Appearance; Custom keeps base, accent and background. Blue is reserved for focus, a separate AI colour for AI marks, 8 folder colour pairs. All pairs checked for WCAG 2.1 AA in both themes.
7. **Surfaces.** One field: a small dialog (rename and new folder; on phones a bottom sheet above the keyboard), so a click on an item always opens it. A few fields: a slide-over. Longer work: a page with a URL. Never a dialog on a dialog. Destructive confirmations name the thing ("Delete “Old projects” forever?").
8. **Phones.** Below 40em every menu, select and picker opens as a bottom sheet; rows with actions have a visible 44px ⋯ button; no search field at the top, the Search tab opens search full screen; a tab bar (Library, Revisit, Add, Search, You). Tablet (40–64em) gets a rail and a top bar instead of the phone shell.
9. **States.** Empty, error, offline, blocked site and similar states use animated line scenes (the `StateScene` set) with a reduced-motion fallback, not cartoons.
10. **Source of truth.** The design system artifact "Shelfmark Next" and `docs/design-next/` replace `docs/design/` once the migration starts. Tokens come from `docs/design-next/design-system/tokens.json`; `bundle.css` is a reference for the look, never copied into Angular components.

## Consequences

- Every screen changes. The migration is done in the order of `migration-plan.md`: tokens first, then shared components, then shell, then screens by group, each behind screenshots in both themes on desktop, tablet and phone.
- Some components change their API (Toast, Menu → sheet on phones, Dialog as sheet, rename dialog), so call sites in `apps/web` change with them.
- Removed: glass (`_glass.scss`), folder highlight and cover (D4), pill radii, the Custom theme corner setting, inline rename.
- Kept from the shipped product: Pinned, Pin to top of folder and Favorites (D3), Side by side (D5), the Fill in with AI button in Suggest mode (D6), click opens the preview (D13).
- `docs/design/` and its ADRs stay for reference until the migration finishes; CLAUDE.md's design source of truth is switched to `docs/design-next/` in the first migration issue.
