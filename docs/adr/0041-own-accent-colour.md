# 0041. Own accent colour of the Custom theme, drawn in its nearest WCAG AA shade

- Status: Accepted
- Date: 2026-11-12
- Source: issue #315 (author review of `stage`); accepted by the author on Nov 12, 2026 (#326); `docs/PROJECT.md` 4 (story 27), 5.8, 6.1, 6.2, 7.1; screen `Themes` (the "+" swatch); builds on the Custom theme of #273

## Context

The Custom theme (#273) offered eight curated accents whose token families (`accent`, `accent-bg`, `accent-text`, `focus-ring`) live as Sass maps in `libs/ui/src/styles/tokens/_custom.scss`, generated into attribute rules and checked for WCAG AA by `custom-theme-contrast.spec.ts`. The Themes mockup also draws a "+" swatch for any colour, and the author asked for it: people add their own accent, while the 4.5:1 rule must hold in light and dark. A free colour cannot have a precompiled Sass rule, and one colour is rarely readable on both bases.

## Decision

1. **Contract.** `CustomTheme.accent` is a curated name or an own colour as lower-case `#rrggbb` (`HexColour`, `HEX_COLOUR_PATTERN`, `isHexColour` in the contracts). The API validates it in `CustomThemeDto` (curated name or the pattern, nothing else) and the `users_custom_theme_accent_check` CHECK allows the same; the column stays `custom_theme_accent`.
2. **The stored colour is the person's colour, the drawn colour is accessible.** `libs/ui` derives the family at apply time: `customAccentTokens(hex, base, background)` takes the nearest shade of the same hue and saturation (lightness moved towards black on the light base, towards white on the dark base) that keeps the accent rules of the curated families (4.5:1 on the page and panels, 3:1 on hovered and pressed rows and on its own tint), a tint of about 14% that keeps text and muted text at 4.5:1, a deeper or paler `accent-text` at 4.5:1 on the tint, panels and page, and the focus ring. Switching the base or background therefore never shows an unreadable accent.
3. **Applied as custom properties.** ThemeService sets `data-custom-accent="own"` (no Sass rule matches) and the four tokens on `html` through CSSOM (`style.setProperty`), which the strict CSP allows (it blocks style attributes in markup and inline `<style>`, not CSSOM), like the existing `color-scheme`. Theme thumbnails bind the same tokens on their drawing.
4. **The picker asks before it adjusts.** `ui-color-picker` (system colour input plus a hex field) commits a finished colour; the page applies it at once when it already passes on the current base and background, otherwise it shows a warning with the ratio and a "Use #xxxxxx" button for the nearest passing shade, and saves nothing until the person chooses.
5. **Tests.** `custom-theme-contrast.spec.ts` checks the surfaces the derivation reads against the compiled Sass and runs the full AA criteria for a spread of colours on every base and background.

## Consequences

- An account may hold any lower-case hex accent; the server does not judge contrast (it has no token values), the client always draws a passing shade. A hand-edited row with another value falls back to the default (`toAppearanceSettings`).
- The colour a person sees in the swatch can differ from the drawn accent on the other base; the panel says so.
- Adding a token to the accent family later means extending `customAccentTokens` and the spec, not only the Sass maps.
