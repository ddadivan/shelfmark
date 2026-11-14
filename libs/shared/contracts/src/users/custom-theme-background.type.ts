import type { CUSTOM_THEME_BACKGROUND } from './custom-theme-background.const';

/** One of `CUSTOM_THEME_BACKGROUND`. */
export type CustomThemeBackground =
  (typeof CUSTOM_THEME_BACKGROUND)[keyof typeof CUSTOM_THEME_BACKGROUND];
