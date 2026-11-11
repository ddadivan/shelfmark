import type { CustomThemeAccent } from './custom-theme-accent.type';
import type { CustomThemeBackground } from './custom-theme-background.type';
import type { CustomThemeBase } from './custom-theme-base.type';
import type { CustomThemeCorners } from './custom-theme-corners.type';

/**
 * The Custom theme: a fixed base plus curated accent, background and corners. It only swaps token
 * values (BRAND.md, Colour). `background` must be one of `CUSTOM_THEME_BACKGROUNDS[base]`.
 */
export interface CustomTheme {
  base: CustomThemeBase;
  accent: CustomThemeAccent;
  background: CustomThemeBackground;
  corners: CustomThemeCorners;
}
