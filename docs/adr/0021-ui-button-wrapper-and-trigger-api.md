# 0021. ui-button stays a wrapper; trigger API and uiRipple directive

- Status: Accepted
- Date: 2026-11-05
- Source: issue #22; `docs/design/components/Button/README.md`, `Ripple/README.md`, `Motion/README.md`; ADR 0014, 0017

## Context

`ui-button` renders an inner native `<button>` inside a `<ui-button>` host. Attributes and directives that a feature puts on `<ui-button>` land on the host, which is not focusable: ARIA state (`aria-expanded`, `aria-controls`, ...), tooltips (#26), menu triggers (#27) and overlay anchoring all need the inner element. The Button spec also requires a link-styled button and a ripple on every button. `libs/ui` has no routing, so `routerLink` cannot be used inside it.

## Decision

- **`ui-button` stays a wrapper component** (`<ui-button>` with an inner `<button>`). An attribute component (`button[uiButton]`, where the host is the native element) was considered and rejected by the author.
- **Trigger API** on `ui-button`:
  - Forwarded inputs, bound to the inner element and absent when unset: `ariaLabel` (existing), `ariaExpanded`, `ariaControls`, `ariaHaspopup`, `ariaDescribedby`, `ariaPressed`.
  - Public `focus(options?)` and a read-only `element` signal with the inner native element.
  - DI token `UI_FOCUS_TARGET` (`UiFocusTarget`: `element` signal + `focus()`), provided by `ui-button` with `useExisting`. Trigger directives inject it from their own host (`optional`, `self`) and fall back to the host `ElementRef` for other hosts.
- **Links through `href`**: an `href` input renders an inner `<a href>` with the same classes instead of `<button>`; `type` does not apply. A disabled link renders `role="link"`, `aria-disabled="true"` and no `href`, and swallows clicks. The `linkClick` output fires for plain left clicks (button 0, no modifier key) and the feature may `preventDefault()` and route; middle click and Cmd/Ctrl-click keep native behaviour. One component keeps one style source, one variant/size/icon API and one test set; a separate `ui-link-button` would duplicate all of them for a tag swap.
- **`uiRipple` directive** (`[uiRipple]`, works on any host):
  - Starts on `pointerdown` at the touch point (circle to the farthest corner), grows 450 ms `ease-out` while held, fades 350 ms on release; a pointer moving more than 10 px cancels (fades). Enter / Space start from the centre and fade on keyup.
  - The span is `aria-hidden`, positioned with CSSOM writes (no `style` attribute, strict CSP), removed on the fade's `animationend` and on destroy.
  - Colour `currentColor` at 6% light / 10% dark; filled buttons raise it to **20%** through `--ui-ripple-opacity` (Motion spec and PROJECT.md 7.1 win over the 22% in the Ripple spec). Styles are global (`ripple` mixin in `global.scss`) because the span is created at runtime outside view encapsulation; timings 450/350 ms are the Motion spec's own and live as Sass variables, not duration tokens.
  - No ripple when the host is `disabled` or `aria-disabled="true"`, when opted out with `[uiRipple]="false"`, or under `prefers-reduced-motion: reduce` (only the pressed background shows; no press scale).
  - `ui-button` applies it on the inner `<button>` / `<a>` and has a `ripple` input to opt out.

## Consequences

- No breaking change: existing `ui-button` inputs and markup keep working.
- Later trigger directives depend on `UI_FOCUS_TARGET`; any new wrapper component with an inner native control should provide it.
- Features route link buttons themselves (`(linkClick)`); clicks on an enabled link also reach plain `(click)` listeners on the host.
- The ripple needs `global.scss` loaded (the app and Storybook already do).

## Alternatives considered

- **Attribute component `button[uiButton]`** — host is the native element, no forwarding needed; rejected by the author (loses the template wrapper, icons and content structure stay in the consumer's hands).
- **Separate `ui-link-button`** — duplicates styles, inputs and tests.
- **`routerLink` inside `libs/ui`** — libs/ui is presentational with no routing.
- **Forwarding ARIA through host attributes only** — the host is not focusable, so assistive tech would read state from the wrong element.
