# 0015. rem units and em breakpoints

- Status: Accepted
- Date: 2026-11-05
- Source: `docs/PROJECT.md` 7.1 "Style" (units: rem); root `CLAUDE.md` (UI); stage 0 planning

## Context

The interface must scale with the font size the user sets in the browser or OS. Designs and the design system are drawn in px for readability.

## Decision

- **Sizes in `rem`**: font sizes, spacing, control heights, radii and widths. Base 16 px; tokens are converted (`space-1` = 0.25rem, `space-4` = 1rem, 15 px font = 0.9375rem). The root is never overridden: `html { font-size: 100% }`.
- **Breakpoints in `em`**.
- **px only for**: border widths, `outline`, `outline-offset`, `box-shadow`, and the 2px loading progress bar (exception list agreed in the stage 0 plan). SVG icons set no `stroke-width` in px.
- `ui-dev` converts design px values with the SCSS function `rem($px)`.
- **Enforced by stylelint** ([0003](0003-tooling-guardrails.md)): `px` forbidden outside the exceptions and `rem()`; media `width` / `height` only in `em`.
- Phone layouts from 360px are tested in e2e ([0008](0008-e2e-playwright-chromium.md)).

## Consequences

- The whole UI grows with the user's font setting; layouts switch at breakpoints relative to font size.
- Hairlines, focus rings and shadows stay crisp because they remain in px.
- The current stylelint config allows px for borders, outline and box-shadow only; the 2px progress bar needs either `rem()` or a targeted rule when it is built.

## Alternatives considered

- **px everywhere** — ignores the user's font-size preference.
- **Overriding the root font size (62.5% trick)** — explicitly excluded: the root stays at 100%.
