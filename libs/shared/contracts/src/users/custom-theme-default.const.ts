import { CUSTOM_THEME_ACCENT } from './custom-theme-accent.const';
import { CUSTOM_THEME_BACKGROUND } from './custom-theme-background.const';
import { CUSTOM_THEME_BASE } from './custom-theme-base.const';
import { CUSTOM_THEME_CORNERS } from './custom-theme-corners.const';
import type { CustomTheme } from './custom-theme.interface';

/** What a new account has and what "Reset custom theme" goes back to (Themes mockup). */
export const CUSTOM_THEME_DEFAULT: Readonly<CustomTheme> = {
  base: CUSTOM_THEME_BASE.Light,
  accent: CUSTOM_THEME_ACCENT.Ocean,
  background: CUSTOM_THEME_BACKGROUND.Paper,
  corners: CUSTOM_THEME_CORNERS.Soft,
};
