import type { CustomThemeAccent } from './custom-theme-accent.type';
import type { CustomThemeBackground } from './custom-theme-background.type';
import type { CustomThemeBase } from './custom-theme-base.type';
import type { CustomThemeCorners } from './custom-theme-corners.type';
import type { HexColour } from './hex-colour.type';

/**
 * The Custom theme: a fixed base plus an accent, background and corners. It only swaps token
 * values (BRAND.md, Colour). `background` must be one of `CUSTOM_THEME_BACKGROUNDS[base]`. The
 * accent is a curated name or an own colour (`#rrggbb`, #315); the app draws an own colour in its
 * nearest shade that keeps WCAG AA on the base (`customAccentTokens` in `libs/ui`). The background
 * may be an own colour too (#335): it must belong to no base, and the app draws the nearest shade
 * that keeps text and muted text at 4.5:1 (`customBackgroundTokens` in `libs/ui`).
 */
export interface CustomTheme {
  base: CustomThemeBase;
  accent: CustomThemeAccent | HexColour;
  background: CustomThemeBackground | HexColour;
  corners: CustomThemeCorners;
}
