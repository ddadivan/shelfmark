# libs/ui

Shelfmark's own component library: tokens, themes, `ui-*` components and Storybook. Consumed by `apps/web` from source through the `@shelfmark/ui` path alias; it also builds as a library with ng-packagr (`nx build ui`). Design source: `docs/design/` (`BRAND.md`, `components/<Name>/README.md`, `components/Motion/README.md`). Decision record: `docs/adr/0017-libs-ui-foundation.md`.

## Presentational only

- No HTTP, no stores, no routing, no Transloco. Every visible string and every `aria-label` comes in through an input (or projected content); the feature translates it.
- Components know nothing about links, folders or users. Data in via inputs, events out via `output()`.
- Only `libs/ui` components are used by features; a missing component is added here first.

## Layout

```
libs/ui/
  .storybook/            main.ts, preview.ts
  src/
    index.ts             public API, re-exports only
    assets/icons/        sprite.svg (served as /assets/ui/icons/sprite.svg)
    styles/              _functions, _media, _typography, tokens/*, _ui (Sass API), global.scss
    testing/axe.ts       axe-core helper for specs
    lib/<name>/          <name>.component.ts|html|scss|spec.ts|stories.ts, index.ts, models/
```

## Component rules

- One component (or directive) per folder, selector `ui-<name>`, standalone, `OnPush`, `host: {}` (no `@HostBinding` / `@HostListener`), signal `input()` / `output()` / `model()`, `inject()`.
- Variants and sizes are typed union inputs with defaults; each union lives in its own `models/<name>.type.ts`. Booleans use `booleanAttribute`.
- Behaviour (keyboard, focus, ARIA, overlays) comes from native elements first, then Angular Aria / CDK. No Angular Material, no Tailwind, no third-party icon sets, no `@angular/animations`.
- Templates in `.html`, styles in `.scss` files (stylelint does not see inline `styles:`).
- Follow `.claude/skills/create-ui-component` and `angular-v22-rules`.

## Styles

- Colours, spacing, radii, durations and easings only through CSS custom properties from the tokens; no hard-coded colours, no `!important`, no `::ng-deep`.
- Component SCSS starts with `@use '../../styles/ui' as *;` (relative path, works in every builder). It gives `rem($px)`, `type($style)`, `hover`, `reduced-motion`.
- Sizes in `rem` via `rem(24px)`. Plain `px` is allowed only for border widths, `outline`, `outline-offset` and `box-shadow` (and `--shadow-*` tokens). Breakpoints in `em`. stylelint enforces this (`npm run lint:styles`).
- The 2px top progress bar is the one other `px` exception and needs a described disable: `/* stylelint-disable-next-line unit-disallowed-list -- 2px progress bar per spec */` (descriptionless disables are reported).
- Class names are BEM (`ui-button--primary`, `ui-icon__svg`).
- `:hover` only through the `hover` mixin (`@media (hover: hover)`); `:focus-visible` shows the 2px `focus-ring` outline; wrap movement and scale in `@include reduced-motion`.
- Type styles come from the `type($style)` mixin (display, title, heading, body, label, caption, mono); there are no global type classes.

## Themes

`global.scss` defines the tokens: scale tokens on `:root`, light on `:root, [data-theme='light']`, dark on `[data-theme='dark']`, and dark again under `@media (prefers-color-scheme: dark)` for `:root:not([data-theme])`. An explicit `data-theme` always wins; without one the OS decides. Every component must work in both; check both in Storybook.

## Icons

- `ui-icon name="…"` draws a symbol from `src/assets/icons/sprite.svg` via `<use href="…#sm-<name>">`. Icons are filled outlines: colour comes from `currentColor`; never ship `stroke`. Sizes 16, 20 or 24 only.
- The sprite is an external file, not inlined, so the CSP needs no `unsafe-inline`. Its URL is the `ICON_SPRITE_URL` token (default `assets/ui/icons/sprite.svg`); the app maps `libs/ui/src/assets` to `assets/ui`.
- Add an icon: (1) export a filled-outline SVG, (2) add a `<symbol id="sm-<name>" viewBox="0 0 24 24">` to `sprite.svg` with no `fill`/`stroke`, (3) add `<name>` to `ICON_NAMES` in `lib/icon/models/icon-names.const.ts`. A unit test fails if the two drift apart. Update `docs/design/assets/icons/` too: `libs/ui/src/assets/icons/sprite.svg` must equal `docs/design/assets/icons/sprite.svg` except for the removed root `style="display:none"`, and a unit test fails on drift.

## Fonts

Onest (variable) is self-hosted through `@fontsource-variable/onest` (SIL OFL 1.1, credit Onest by Sergey Shabanov / Onest Project Authors) and loaded by the app styles and `.storybook/preview.ts`; no Google Fonts requests. The mono token falls back to `ui-monospace` until JetBrains Mono is added.

## Storybook

- `npx nx storybook ui` serves, `npx nx build-storybook ui` builds (Vite, `@storybook/angular-vite`). The toolbar switches light and dark (`data-theme` on `html`).
- Every component has a story file with one story per variant and state plus an "All variants" story that shows both themes. The a11y addon runs axe in a real browser (including colour contrast) and fails the story on violations.

## Tests

- Vitest through `@angular/build:unit-test`; coverage thresholds 80% (statements, branches, functions, lines).
- Every component spec checks variants/host classes, inputs and outputs, keyboard where relevant, disabled behaviour, and runs axe with `axeViolations()` from `src/testing/axe.ts` (colour contrast is off in jsdom; Storybook covers it).

## Commands

```bash
npx nx storybook ui
npx nx build-storybook ui
npx nx test ui --coverage
npx nx run-many -t lint typecheck test build -p ui
npm run lint:styles
```
