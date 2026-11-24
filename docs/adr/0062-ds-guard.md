# 0062. DS guard: CI fails when styles drift from the Shelf tokens

- Status: Proposed
- Date: 2026-11-24
- Source: author request after blocks 4 and 5 of the Shelf redesign (ADR 0061); tokens `docs/design-next/shelf/design-system/tokens.json`

## Context

- Blocks 1 to 5 built the Shelf screens by eye against the prototypes. The prototypes themselves use values outside `tokens.json` (8px and 6px corners on 136 and 83 places, 18px section titles, 10px favicon letters), and the code had collected raw values on top: 26 hex colours, 11 `rgb()` calls, 68 off-scale radii, 137 raw font sizes and 8 soft shadows outside the token files (landing included).
- Nothing failed when a component used `rem(13px)` or `#000`, so drift was found only in screenshot reviews, and the token values in `libs/ui` could differ from `tokens.json` without anyone noticing.

## Decision

Three layers, each cheap enough for every pull request:

1. **Stylelint** (`stylelint.config.mjs`, `npm run lint:styles`, CI and the pre-commit hook). Core rules keep raw colours in `libs/ui/src/styles/tokens/*` (`color-no-hex`, `color-named`, `function-disallowed-list` for `rgb()` / `hsl()` and friends; `transparent`, `currentcolor`, `inherit` and `color-mix()` over tokens stay allowed). A small plugin, `tools/stylelint/shelf-tokens.mjs` (tested with `node --test tools/stylelint/`), adds:
   - `shelf/radius-token`: `var(--radius-*)`, `0`, `50%`, `inherit`, or a component hook `var(--ui-…-radius, <allowed>)`; `--ui-…-radius` custom properties are checked too.
   - `shelf/font-size-token`: a type-scale token `var(--font-size-*)` (also in the `font` shorthand) or an expression of custom properties only (`calc(var(--font-size-label) * var(--ui-button-scale, 1))`, the Reader size setting); no raw length anywhere, fallbacks included.
   - `shelf/shadow-token`: `var(--shadow-*)`, `none`, a focus ring with `var(--focus-ring)`, or a hard-edged ring (`[inset] x y [0 [spread]] <token colour>`, no blur). Rings are borders drawn with box-shadow (hairlines, selection rings, drop targets), not elevation; every soft shadow must be a token.
   - Exceptions are `/* stylelint-disable-next-line <rule> -- reason */` (`reportDescriptionlessDisables`). Legitimate ones: illustrations of other people's UI, the colour picker's own colour space, a mask's alpha, Reader sizes that scale with the reading setting. The landing has a file-level disable until block 6 rebuilds it.
2. **Token sync** (`libs/ui/src/styles/token-sync.spec.ts`, Vitest). It compiles the light, dark and scale tokens and compares every colour in both themes (accent variants through the Custom theme rules), the radii, the type scale (size and line height), the shadows and the spacing with `tokens.json`, after normalising formats and resolving aliases. Renames are one typed map (`styles/models/token-renames.const.ts`: canvas → bg, control → border-control, accent → primary, on-accent → on-primary, focus → focus-ring, scrim → overlay, brand-notch → logo-bookmark, highlight → shadow-highlight, space-4… → space-1…). A token on one side only fails unless `styles/models/code-only-tokens.const.ts` names it with a reason. Contrast pairs (`contrast-pairs.const.ts`) check WCAG AA: text and muted text 4.5:1 on the canvas and the surfaces, the note on `ai-bg`, status colours on their tints, control edges and the focus ring 3:1. The gaps the author accepted in ADR 0061 point 7 are documented, not checked.
3. **Rendered check** (`libs/ui/a11y/ds-tokens.mts`, run by `storybook.a11y.mts` for every story in both themes, after axe). It resolves the token set of the active theme in the page (per theme host, so theme pickers and the Reader use their own values), walks the visible elements and asserts that colour (on elements with their own text), background colour, border colours (sides wider than 0), font size and corner radii are tokens. It skips `svg`, `img`, `video`, `canvas` and subtrees marked `data-ds-ignore` (illustrations of other people's UI, colours the person picked, third-party previews), and sizes inside the documented scale inputs (`--ui-button-scale` and friends).

**Rule for new values:** a new colour, radius, font size or shadow is first added as a token in `tokens.json` (and the token files), then used. Values the prototypes draw outside `tokens.json` became code-only tokens with their reason: `--font-size-section` (18), `--font-size-micro` (10), `--radius-tile-sm` (6), `--radius-tile` (8), `--search-hairline`, `--shadow-thumb`, and the component tints the rendered check found (`--toast-muted`, `--toast-tile`, `--toast-tile-hover`, `--tooltip-kbd`, `--card-overlay`, `--status-text`); the type scale is now tokens (`--font-size-*`, `--line-height-*`) that the `type()` mixin reads.

## Consequences

- Drift fails in CI at the layer that sees it first: the source (stylelint), the token values (Vitest), or what a story actually paints (Storybook runner).
- Fixing the existing drift changed a few looks by a pixel or two: off-scale radii moved to the nearest token (3px and 5px corners to 4 / 6, 2px grips and bars to full, 24 to 32px large corners to 16), 11 / 13 / 15 / 17 / 19px text to the nearest scale size, `mono` to the Shelf 12 / 1.4, the sign-in card to `radius-lg`. Visual baselines need the final regeneration pass.
- The code-only list is the place where the design and the code still disagree; moving an entry into `tokens.json` removes it from the list (the spec fails while both exist).
- The rendered check adds a little time to each story of the Storybook run; colours that come from data (own folder colours, site brand colours) must be marked `data-ds-ignore` by the component that draws them.
