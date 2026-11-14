import type { CUSTOM_THEME_BASE } from './custom-theme-base.const';

/** One of `CUSTOM_THEME_BASE`. */
export type CustomThemeBase = (typeof CUSTOM_THEME_BASE)[keyof typeof CUSTOM_THEME_BASE];
