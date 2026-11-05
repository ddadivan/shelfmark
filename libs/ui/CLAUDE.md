# libs/ui

Shelfmark's own component library: tokens, themes, `ui-*` components and Storybook. Consumed by `apps/web` from source through the `@shelfmark/ui` path alias; it also builds as a library with ng-packagr (`nx build ui`). Design source: `docs/design/` (`BRAND.md`, `components/<Name>/README.md`, `components/Motion/README.md`). Decision record: `docs/adr/0017-libs-ui-foundation.md`.

## Presentational only

- No HTTP, no stores, no routing, no Transloco. Every visible string and every `aria-label` comes in through an input (or projected content); the feature translates it.
- Components know nothing about links, folders or users. Data in via inputs, events out via `output()`.
- Only `libs/ui` components are used by features; a missing component is added here first.

## Layout

```
libs/ui/
  .storybook/            main.ts, preview.ts, foundations.scss (styles of the docs pages only)
  src/
    index.ts             public API, re-exports only
    assets/icons/        sprite.svg (served as /assets/ui/icons/sprite.svg)
    styles/              _functions, _media, _breakpoints, _focus, _utilities, _motion, _typography, tokens/*, _ui (Sass API), global.scss
    foundations/         Storybook "Foundations" docs stories (colours, type, spacing, motion, ...); not exported
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
- Component SCSS starts with `@use '../../styles/ui' as *;` (relative path, works in every builder). It gives `rem($px)`, `type($style)`, `hover`, `reduced-motion` and the mixins below.
- Sizes in `rem` via `rem(24px)`. Plain `px` is allowed only for border widths, `outline`, `outline-offset` and `box-shadow` (and `--shadow-*` tokens). Breakpoints in `em`. stylelint enforces this (`npm run lint:styles`).
- The 2px top progress bar is the one other `px` exception and needs a described disable: `/* stylelint-disable-next-line unit-disallowed-list -- 2px progress bar per spec */` (descriptionless disables are reported).
- Class names are BEM (`ui-button--primary`, `ui-icon__svg`).
- `:hover` only through the `hover` mixin (`@media (hover: hover)`); `:focus-visible` uses `@include focus-ring`; wrap movement and scale in `@include reduced-motion`.
- Type styles come from the `type($style)` mixin (display, title, heading, body, label, caption, mono); there are no global type classes.

## Shared mixins, keyframes and breakpoints

All come from `@use '../../styles/ui' as *;` and are tested in `src/styles/styles.spec.ts` (the spec compiles the Sass and checks the output, including the reduced-motion fallbacks).

| Mixin                                     | Use                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `focus-ring($offset: 2px)`                | Declarations for `&:focus-visible`: 2px solid `focus-ring` outline, 2px offset. Never hand-write the ring.                                                                                                                                                                                                                                                                        |
| `field-focus`                             | On a text-field wrapper (required for every field): 120 ms transition, `:focus-within` turns the border `focus-ring` and adds the soft 3px halo (transparent outline stays for forced colours). It also removes the global outline from the bare `input` / `textarea` / `[contenteditable]` inside, so there is one indicator; a field without the wrapper keeps the global ring. |
| `visually-hidden`                         | Screen-reader-only text: live regions, "Step N of M".                                                                                                                                                                                                                                                                                                                             |
| `line-clamp($lines)`                      | Ellipsis after N lines (card titles 2, domains 1).                                                                                                                                                                                                                                                                                                                                |
| `phone`, `tablet`, `tablet-up`, `desktop` | Breakpoints in `em`: phone `< 40em`, tablet `40em` to `< 64em` (63.99em), desktop `>= 64em`; `tablet-up` is `>= 40em`. Range syntax: no gaps, no overlaps.                                                                                                                                                                                                                        |
| `enter($name)`, `leave($name)`            | Animation presets (below) with duration and easing tokens and a built-in reduced-motion fallback.                                                                                                                                                                                                                                                                                 |
| `loop(spin \| progress \| shimmer)`       | Endless loaders; the only `linear` curves. Reduced motion: spinner and bar slower, shimmer stops.                                                                                                                                                                                                                                                                                 |
| `origin($fallback: top left)`             | `transform-origin: var(--ui-origin, …)`.                                                                                                                                                                                                                                                                                                                                          |

**Keyframes** are defined once, in `global.scss` (`@include keyframes`), prefixed `ui-`: `pop-in`, `pop-out`, `fade-out`, `reveal`, `sheet-in`, `sheet-out`, `slide-up`, `toast-out`, `spin`, `spinner-in`, `spinner-grow`, `spinner-out`, `spinner-shrink`, `shimmer`, `progress`, `ripple-grow`, `ripple-fade`. Components never declare `@keyframes`; they use a preset or, for a new moment, add the keyframes to `_motion.scss`.

**Presets** (duration, easing): `enter(pop)` 200 ms `ease-out` (menus, listboxes, dialogs), `enter(fade)` 200 ms (skeleton to content), `enter(toast)` 320 ms `ease-out`, `enter(sheet)` 320 ms `ease-drawer`, `enter(spinner)` / `enter(spinner-grow)` 200 ms (plus the spin). `leave(pop)` / `leave(fade)` 120 ms `ease-out`, `leave(toast)` 120 ms `ease-in`, `leave(sheet)` 200 ms `ease-in`, `leave(spinner)` / `leave(spinner-shrink)` 120 ms. Presets are finite (no `infinite`), so `animate.leave` can finish; a spinner's rotation is `@include loop(spin)` on the inner element, never on the element that has `enter` / `leave`. Under `prefers-reduced-motion: reduce` every `enter` becomes `ui-reveal` (200 ms fade) and every `leave` a `ui-fade-out`; movement and scale are gone (so `enter(spinner-grow)` loses its margin growth and the label does not slide).

**Convention for Angular animations.** Put the preset in a modifier class and bind it with `animate.enter` / `animate.leave` on the element that appears and disappears:

```scss
.ui-menu--enter {
  @include enter(pop);
  @include origin;
}

.ui-menu--leave {
  @include leave(pop);
}
```

```html
<div class="ui-menu" animate.enter="ui-menu--enter" animate.leave="ui-menu--leave">…</div>
```

Angular keeps the element until the leave animation ends and a second toggle mid-animation reverses it. Menus and listboxes scale from their trigger: the overlay sets `--ui-origin` (for example `100% 0`) on the panel from its anchor; dialogs keep `center`. The ripple is the `uiRipple` directive (below). The FLIP helper, the "card lands" moment, View Transitions and the logo animation are not part of this foundation.

## Trigger API and ripple (ADR 0021)

`ui-button` stays a wrapper around a native `<button>` (or an `<a>` with `href`). Attributes and directives on `<ui-button>` land on the non-focusable host, so:

- **ARIA inputs** on `ui-button` go to the inner element and render nothing when unset: `ariaLabel`, `ariaExpanded`, `ariaControls`, `ariaHaspopup`, `ariaDescribedby`, `ariaPressed`.
- **Focus target**: `focus(options?)` and the `element` signal (inner native element). `UI_FOCUS_TARGET` (`UiFocusTarget`) is provided by `ui-button`; a trigger directive (tooltip, menu trigger, overlay origin) does `inject(UI_FOCUS_TARGET, { optional: true, self: true })` and falls back to its host `ElementRef`. Any new wrapper component with an inner native control provides it too.
- **Links**: `href` renders an inner `<a>` with the same classes; `(linkClick)` fires for plain left clicks (no modifier key), the feature calls `preventDefault()` and routes (`routerLink` is not available here). A disabled link has no `href`, `role="link"`, `aria-disabled="true"` and swallows clicks.
- **`uiRipple`** works on any host (rows, menu items, chips): pointer origin, Enter / Space from the centre, cancelled by a move over 10 px, no ripple when `disabled` / `aria-disabled`, `[uiRipple]="false"` opts out, no ripple under reduced motion. Colour `currentColor` at 6% / 10% (dark); a host raises it with `--ui-ripple-opacity` (filled buttons: 0.2). Its styles are the global `ripple` mixin in `global.scss` (the span is created at runtime, outside view encapsulation). The host class `ui-ripple-host` sets `position: relative`, `overflow: hidden`, `isolation: isolate` through `:where()` (zero specificity), so a host that needs `absolute` or `sticky` just sets its own `position`; the ripple only needs a positioned host. `ui-button` applies it on the inner element; `[ripple]="false"` opts out.

## Overlays and tooltip (issue #26)

- **CDK overlay CSS** is included once in `global.scss` (`@use '@angular/cdk/overlay'; @include overlay.overlay`), so under a strict CSP no `<style>` is injected at runtime. Storybook adds `node_modules` to the Sass `loadPaths` for that bare `@use`; the Angular builder resolves it itself. `@angular/cdk` is a peer dependency of `libs/ui`.
- **`UiOverlay.connect({ origin, positions, layer, panelClass? }, { injector?, onPositionChange? })`** returns a `ConnectedOverlay` (flexible position with flip, push on screen, reposition on scroll, no backdrop). `--ui-origin` is set on the pane from the resolved position (`overlayTransformOrigin`, `setOverlayOrigin`, `connectedSide`; `sidePositions(side)` gives preferred plus opposite). The owner renders content that appears and disappears with `@if` + `animate.enter` / `animate.leave` (a `pop` preset with `@include origin`), then calls `release()`: it detaches after the leave animations end (`getAnimations`), `cancelRelease()` / a new `attach()` makes a second open mid-animation work. Pass the owner's `injector` so the overlay is disposed with it.
- **Layers** (z-index, pane class `ui-overlay-layer--<layer>`): dialog 1000 (scrim and panel), menu 1010, toast 1020, tooltip 1030. Floating panel surface: `@include popover`.
- **`uiTooltip`** (`uiTooltip`, `position`, `delay` 400, `uiTooltipShortcut`): hover and keyboard focus, closes on blur, pointer leave, activation and Esc (capture on `document`, stops propagation so a surrounding dialog or menu keeps its own Esc, focus does not move); hoverable (the gap is padding of the panel); never on `(hover: none)` or touch pointers. `aria-describedby` goes on the `UI_FOCUS_TARGET` element (inner button of `ui-button`) or the host, merged with an existing value; it points at a visually hidden description in `<body>` and the visible panel is `aria-hidden`. Do not also bind `ariaDescribedby` on a `ui-button` with a tooltip. An overlay lives in `<body>`, so it takes the theme of `<html>`, not of a nested `data-theme` wrapper.

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
- `Foundations/*` docs pages (`src/foundations/*.stories.ts`): colours and shadows in both themes side by side, type styles, spacing, radii, the Motion tables with live demos (`animate.enter` / `animate.leave`), breakpoints and focus. Page styles live in `.storybook/foundations.scss`; token lists in `src/foundations/models/`.
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
