# libs/ui

Shelfmark's own component library: tokens, themes, `ui-*` components and Storybook. Consumed by `apps/web` from source through the `@shelfmark/ui` path alias; it also builds as a library with ng-packagr (`nx build ui`). Design source: `docs/design/` (`BRAND.md`, `components/<Name>/README.md`, `components/Motion/README.md`). Decision record: `docs/adr/0017-libs-ui-foundation.md`.

## Presentational only

- No HTTP, no stores, no routing, no Transloco. Every visible string and every `aria-label` comes in through an input (or projected content); the feature translates it.
- Components know nothing about links, folders or users. Data in via inputs, events out via `output()`.
- Only `libs/ui` components are used by features; a missing component is added here first.

## Layout

```
libs/ui/
  .storybook/            main.ts, preview.ts, foundations.scss and illustration-stories.scss (styles of the docs pages and stories only)
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

## Illustrations, logo and empty states

- `ui-illustration` draws the 8 scenes as inline SVG in its template (no `innerHTML`, no inline `style`, fills are token-bound classes). `motion` is `loop` (3-5 s cycle, landing / welcome / sign-in), `once` (plays, then holds the final frame; empty states and errors) or `none`; the caller picks it and each scene has a default (`ILLUSTRATION_DEFAULT_MOTION`: welcome scenes loop, the rest play once). Resting styles are the final frame, so `none` and `prefers-reduced-motion` just remove the animation.
- Scene keyframes (`ui-ill-*`) and the two durations live in `styles/_illustration.scss` (`@include illustration-keyframes` in `global.scss`), apart from the shared presets; offsets are percentages of the element box, set through `--ill-*` custom properties on the scene classes.
- Loops run continuously. The app may later pause off-screen ones (for example with an `IntersectionObserver` toggling `motion` to `none`); the component does not do that itself.
- `ui-logo`: `variant` `lockup` / `mark`, `tone` `color` (theme tokens) / `mono` (`currentColor`), mark size through `--ui-logo-size`.
- `ui-empty-state`: `illustration` or `icon`, `heading` (not `title`: that would add a native tooltip), `text`, `headingLevel`; the action is projected content.

## Overlays and tooltip (issue #26)

- **CDK overlay CSS** is included once in `global.scss` (`@use '@angular/cdk' as cdk; @include cdk.overlay` — the CDK exports Sass only from its root entry), so overlays are styled before the CDK loads anything. This does not remove runtime styles: the CDK `OverlayContainer` and component `styleUrl`s still add `<style>` elements, so under the strict CSP `apps/web` needs the nonce from ADR 0022 before an overlay renders. Storybook adds `node_modules` to the Sass `loadPaths` for that bare `@use`; the Angular builder resolves it itself. `@angular/cdk` is a peer dependency of `libs/ui`.
- **`UiOverlay.connect({ origin, positions, layer, panelClass? }, { injector?, onPositionChange? })`** returns a `ConnectedOverlay` (flexible position with flip, push on screen, reposition on scroll, no backdrop). `--ui-origin` is set on the pane from the resolved position (`overlayTransformOrigin`, `setOverlayOrigin`, `connectedSide`; `sidePositions(side)` gives preferred plus opposite). The owner renders content that appears and disappears with `@if` + `animate.enter` / `animate.leave` (a `pop` preset with `@include origin`), then calls `release()`: it detaches after the leave animations end (`getAnimations`), `cancelRelease()` / a new `attach()` makes a second open mid-animation work. Pass the owner's `injector` so the overlay is disposed with it.
- **Layers** (z-index, class `ui-overlay-layer--<layer>` on the CDK host element `overlayRef.hostElement`, the stacking context): dialog 1000 (scrim and panel), menu 1010, toast 1020, tooltip 1030. Floating panel surface: `@include popover`.
- **`uiTooltip`** (`uiTooltip`, `position`, `delay` 400, `uiTooltipShortcut`): hover and keyboard focus, closes on blur, pointer leave, activation and Esc (capture on `document`, stops propagation so a surrounding dialog or menu keeps its own Esc, focus does not move); hoverable (the gap is padding of the panel); never on `(hover: none)` or touch pointers. `aria-describedby` goes on the `UI_FOCUS_TARGET` element (inner button of `ui-button`) or the host, merged with an existing value, and skipped when the text equals the target's `aria-label` (no double announcement on icon-only buttons; re-checked when the text changes and each time the tooltip opens); it points at a visually hidden description in `<body>` and the visible panel is `aria-hidden`. Do not also bind `ariaDescribedby` on a `ui-button` with a tooltip. An overlay lives in `<body>`, so it takes the theme of `<html>`, not of a nested `data-theme` wrapper.

## Menu (issue #27)

- `ui-menu` (Angular Aria `ngMenu` as a host directive), `ui-menu-item` (`icon`, `shortcut`, `danger`, `disabled`, `selected`, `type` `item | checkbox | radio`, output `activated`; the host is always `role="none"`, the inner element carries the menuitem role and `aria-checked`), `ui-menu-separator`, and the `uiMenuTrigger` directive. Open with `uiMenuTrigger` on a `ui-button`, or in code: `menu.openFrom(element, { focus })`, `menu.openAt({ x, y })` (context menu; focus returns to the previously focused element), `close()`; `isOpen`, `anchor`, `opened` / `closed`. `align` `start | end`, `ariaLabel`; `inline` renders in place and always open for Storybook and docs only (features must not use it).
- **Trigger decision:** Aria `MenuTrigger` writes its attributes and tabindex on its own host, which for `<ui-button>` is not the focusable element, so `uiMenuTrigger` implements the trigger half itself (click, ArrowDown / ArrowUp, Enter / Space on non-buttons) on the `UI_FOCUS_TARGET` element and writes `aria-haspopup`, `aria-expanded`, `aria-controls` there directly (a directive cannot set another component's inputs; do not also bind those inputs on the button). The popup, arrows, Home / End, Enter / Space and typeahead stay Aria's.
- The host element of `ui-menu` is moved into the overlay pane with a `DomPortal` (`ConnectedOverlay.attachElement`) so Aria's host listeners keep seeing the items; closed, it is hidden and empty. Initial focus is set by dispatching Home / End to the menu, so Aria's active item matches DOM focus. Esc, Tab, an outside press and a choice close it; Esc and a choice return focus first, then `activated` emits. `ConnectedOverlayConfig.origin` also takes a viewport point.

## Chip, avatar, notice, steps (issue #25)

- `ui-chip`: `variant` `tag | neutral`, `clickable` (inner `<button>` with `uiRipple`, output `clicked`), `removable` (separate remove button named by `removeLabel`, output `removed`; Delete / Backspace anywhere in a removable chip also emits it), `disabled`, `icon`. The label is projected; there is no ripple on a non-clickable chip or on the remove button. `focus()` focuses the clickable body, else the remove button. After `removed` the removed chip is gone and focus is lost: the feature must move focus (to a sibling chip via `focus()`, or to the input in a TagInput).
- `ui-avatar`: `src`, `name`, `size` `sm | md | lg`, `label`. Initials (`initialsOf`, grapheme-safe, first and last word; it upper-cases first, so `ß` gives `S`) when `src` is absent or fails (the CSP blocks external hosts; `linkedSignal` retries on a new `src`), a user icon without a name. Decorative (`aria-hidden`) unless `label` gives it `role="img"`.
- `ui-notice`: `kind` `warning | danger`, `icon` override. `warning` is `role="status"`, `danger` `role="alert"`. `ViewEncapsulation.None` with `.ui-notice` selectors so projected links are styled. A live region announces reliably only when content appears in it, so render a notice on demand (`@if`) when an announcement is wanted; one present at page load is not announced.
- `ui-steps`: `count`, `current` (1-based), `label` ("Step N of M", visually hidden, polite live region); dots are `aria-hidden`; earlier dots look like upcoming ones, as in the spec.
- Story layout for these lives in `.storybook/display-stories.scss` (`ds-` classes).

## Dialog (issue #28)

- `DialogService.open<C, R, D>(Component, { size, data, dismissible, scrimClose, role, describedBy, autoFocus })` returns a `UiDialogRef<R, C>` (`close(result?)`, `afterClosed()`, `result` promise, `leaving`, `componentInstance`, `hostElement`). `confirm({ title, message, confirmLabel, cancelLabel, closeLabel?, destructive? })` resolves a boolean: true for confirm; false for Cancel, the close button, Esc and the scrim. All strings come in.
- The content component renders `<ui-dialog title="…" closeLabel="…" [size]>` with the body as content and footer buttons as `slot="footer"` (secondary first, main action last), reads `injectDialogData<T>()` and closes through the injected `UiDialogRef`. A `<form>` may wrap `ui-dialog`. The close button exists only with `closeLabel`; an overflowing body becomes a focusable region.
- Built on CDK `Dialog` (focus trap, focus restore, `aria-modal`, scroll lock, page hidden from AT). The service sets `disableClose` and handles Esc and the scrim itself, so every close plays the leave animation first (`UiDialogRef.close()`: `leaving` signal, `getAnimations`, 800 ms safety timer); focus returns when the overlay is removed. `dismissible: false` turns Esc and scrim off; `scrimClose: false` only the scrim (destructive confirm).
- **Layer:** `ui-overlay-layer--dialog` goes on `overlayRef.hostElement` (`setOverlayLayer`); the scrim is the CDK backdrop with `ui-dialog-scrim` (+ the layer class: a sibling of the host unless the CDK uses a popover host, as in 22). `ui-dialog-scrim` and the wrapper placement (centred; bottom edge below 40em) are global (`styles/_dialog.scss`, `@include dialog-layout` in `global.scss`).
- **Phone sheet** (`< 40em`): `enter(sheet)` / `leave(sheet)`, grip, 44px close button; dragging the grip or header sets `--ui-sheet-drag` (CSSOM, no `style` attribute); release past 30% of the height or a flick over 0.5 px/ms closes (`shouldCloseSheet`), else snaps back. Reduced motion: fade only, the drag still works. Desktop: `enter(pop)` / `leave(pop)` from the centre.
- Confirm focus: confirm button, or Cancel when destructive (`confirm` sets this itself). **`autoFocus` defaults to `first-tabbable`, which is the header close button**, so every form dialog must pass `autoFocus: '<selector>'` (for example `'input'`) to land on its first field; the form story does. `_recaptureFocus` (scrim click on a non-closing dialog) is internal CDK API, checked against 22.2.x.
- Sheet release speed: the last 3 pointer samples; a pause of 100 ms or more before the release counts as speed 0 (no flick). The phone sheet width stays `100vw` (the pane is shrink-to-fit, so `100%` would collapse to the content width).

## Loading (issue #23)

- Pick the indicator by what loads (Loading spec): `ui-button [loading]` for an action the user started, `ui-progress-bar` for navigation and background requests, `ui-meter` for known progress, `ui-load-more` under a list, `ui-save-status` for autosave, skeletons for first loads.
- **`ui-spinner`** (`size` `sm | md | lg`, optional `label`): ring in `currentColor`, rotation on the inner `__ring` (`loop(spin)`), `enter(spinner)` on the host when it is created. Without `label` it is `aria-hidden`; with it, an indeterminate `progressbar`. It leaves only when its owner removes it with `animate.leave` and a class using `@include leave(spinner)` (`spinner-shrink` inside a button); the components below do that already.
- **`ui-button [loading]`**: spinner with `enter(spinner-grow)` (label makes room), `aria-busy="true"`, no ripple, `cursor: progress`. Activation (clicks, Enter / Space, form submit) is blocked by `preventDefault()` plus a capture-phase host listener that calls `stopImmediatePropagation()` only while loading: `(click)` on `<ui-button>` does not fire; document capture listeners (the CDK overlay's outside-press) still see the event, bubble listeners above the button do not. A loading `href` button renders like a disabled link (no `href`, `role="link"`, `aria-disabled="true"`, not dimmed), so middle-click and the context menu cannot navigate. The button stays focusable (not `disabled`). The width is locked in px on the inner element: a `ResizeObserver` keeps the rest width (fallback without one: read after each render), the lock is set when `loading` turns true and released after the leaving spinner's animations finish. The feature changes the label to the -ing form itself. The spinner replaces `iconLeft`; icon-only buttons show a solo spinner (`enter(spinner)`).
- **`ui-progress-bar`** (`active`, `variant` `fixed | inline`, optional `label`): presentational, the app binds `active`. `fixed` is the 2px sage bar at the top of the viewport (z-index 900, below overlays), shown only after 300 ms of `active`; `inline` is a 3px track in a box, shown at once. On finish it fills to 100% and fades (`ui-fade-out`, removed on `animationend`). The 2px height is the described stylelint disable. A finished bar is removed on `animationend` / `animationcancel` of the fade or, as a fallback, after 450 ms; `inline` skips the 300 ms helper. Without `label` it is `aria-hidden`.
- **`ui-meter`** (`value` 0-100, clamped; required `label`): `role="progressbar"`, `aria-valuenow`; percent text is the feature's. **`ui-load-more`** (`text`, `loading`): the host is a persistent `role="status"` live region (keep it rendered, bind `loading`; a region inserted already filled is often not announced), the spinner `sm` plus text row exists only while `loading`. **`ui-save-status`** (`state` `saving | saved | error`, `savingText`, `savedText`, `errorText`): icon plus words in a polite status region; the icons share one 16px slot.
- **`loaderVisible(busy, { delay?, minVisible?, injector? })`** (`lib/loader-timing`): turns a `busy` signal into a `visible` signal that goes true after 300 ms and stays true for at least 400 ms once shown (`LOADER_SHOW_DELAY_MS`, `LOADER_MIN_VISIBLE_MS`); a response faster than the delay shows nothing. Call it in an injection context; timers are cleared on destroy. Features bind loaders to its result, never to the raw request state.

## Toast (issue #29)

- **`ToastService.show({ text, kind?, action?: { label, run }, duration? })`** returns `{ dismiss() }` (`dismiss()` on the service closes the current one). `kind` `info | success | error` (default `info`, own icon each); text and action label are already translated by the feature. 4 s, 8 s with an action (`TOAST_DURATION_MS`); the timer pauses while the toast is hovered or has focus and resumes with the time left. Running the action dismisses (even if it throws). One toast at a time: a newer one replaces the older (Feedback screen shows no stack).
- Rendered through `UiOverlay.global({ layer: 'toast', edge? })`: a full-width pane on the viewport edge with `ui-overlay-pane--passthrough` (`pointer-events: none`), the toast takes pointer events itself; bottom-centre below 40em, bottom-left from `tablet-up`. `ToastService` creates the region when it is first injected and never detaches it: ONE `role="status"` / `aria-live="polite"` region (`ui-toast-region`, internal), toasts are added and removed inside it with `animate.enter` / `animate.leave` (`enter(toast)` / `leave(toast)`), so a region is never inserted already filled. Inject the service early in the feature. Focus is never moved.
- `duration: 0` keeps the toast until it is dismissed. An action that throws goes to the `ErrorHandler`; the toast is dismissed either way. A toast that replaces another under a resting pointer starts paused until the pointer leaves.
- **Keyboard reach:** the toast is outside the tab order of the page, and its timer can end before a keyboard user tabs to it. `ToastService.focusAction()` moves focus to the current toast's action (only on that explicit call; the timer pauses while focused; no-op without a toast or action). (a) The app must bind a global shortcut that calls it (decided with the app shell in stage 2/3). (b) Where feasible an action should also have a persistent alternative in the UI (for example Undo in the item's menu).
- `ui-toast` is the exported view (`kind`, `text`, `actionLabel`, outputs `action`, `pausedChange`); features use the service, not the component. State and timer are in the internal `ToastStore`.

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
- Published as the Vercel project `shelfmark-ui` (`libs/ui/vercel.json`, ADR 0023, `docs/SETUP.md` 5.7). `nx test-storybook ui` builds it, serves `storybook-static` with the headers from `vercel.json` and runs axe-core (including colour contrast) on every story in both themes in Chromium; a CSP violation fails the run.
- Every component has a story file with one story per variant and state plus an "All variants" story that shows both themes. The a11y addon runs axe in a real browser (including colour contrast) and fails the story on violations.

## Tests

- Vitest through `@angular/build:unit-test`; coverage thresholds 80% (statements, branches, functions, lines).
- Every component spec checks variants/host classes, inputs and outputs, keyboard where relevant, disabled behaviour, and runs axe with `axeViolations()` from `src/testing/axe.ts` (colour contrast is off in jsdom; Storybook covers it).

## Commands

```bash
npx nx storybook ui
npx nx build-storybook ui
npx nx test-storybook ui           # axe on every story, light and dark, under the production CSP (libs/ui/a11y); it never reuses a running server, so parallel runs need different `STORYBOOK_PORT` values (default 6007)
npx nx test ui --coverage
npx nx run-many -t lint typecheck test build -p ui
npm run lint:styles
```
