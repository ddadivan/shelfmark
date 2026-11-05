# 0014. Own UI library on Angular Aria / CDK

- Status: Accepted
- Date: 2026-11-05
- Source: `docs/PROJECT.md` 5.0, 5.1, 7, 7.4, 7.5, 7.6; `docs/design/`

## Context

Shelfmark should look recognisable (minimal, monochrome graphite + sage accent, own micro-interactions, icons and illustrations; PROJECT.md 7.1, 7.6) and work in light and dark themes, on desktop and phone. Accessibility (keyboard, focus, ARIA, overlays) must be correct. The design system and screens are made in Claude Design and are the reference for implementation (`docs/design/`).

## Decision

- **`libs/ui`**: an own Angular component library with **design tokens** (CSS variables: semantic colours with a dark set, 4 px spacing scale, radii, typography, shadows, motion durations and curves) and reusable components with typed variants (`ui-button`, `ui-input`, `ui-select`, `ui-dialog`, `ui-menu`, `ui-tree`, `ui-icon`, ...; full list in PROJECT.md 7.4).
- **Behaviour on headless primitives: Angular Aria / CDK** (listbox, combobox, menu, tree, Dialog, Overlay). Look is our own SCSS.
- Components: standalone, signal inputs (`input()`, `output()`, `model()`), variants as union-typed inputs, SCSS only through tokens (no `::ng-deep`, no hard-coded colours), inputs integrated with Signal Forms.
- **Features use only `libs/ui` components**; bare styled `<button>`, `<input>` in features are forbidden (lint and review). Domain components (link card, link form) live in `apps/web` features and are built from `libs/ui`; no separate Nx feature libraries in stage 1.
- **Storybook**: a story with all variants in both themes for every component, plus unit tests and an accessibility check; Storybook is published as a portfolio showcase.
- Own icon set (44 icons, SVG sprite, `ui-icon`), own illustrations; no third-party icon sets. Motion: CSS on tokens, no animation libraries.
- Order of work: tokens → `libs/ui` components with Storybook → screens (7.5).

## Consequences

- Full control over look and motion; accessibility comes from maintained primitives.
- More upfront work than a ready-made kit: about two weeks for the design system stage (9.1).
- Coverage ≥ 80% applies to `libs/ui`; the library is tagged `type:ui` ([0003](0003-tooling-guardrails.md)).

## Alternatives considered

- **Angular Material** — not used (PROJECT.md 5.1); look and behaviour come from the own design system on Aria / CDK.
- **Tailwind** — not used; styles are SCSS on tokens (PROJECT.md 5.1).
