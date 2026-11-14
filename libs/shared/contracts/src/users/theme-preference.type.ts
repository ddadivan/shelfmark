import type { THEME_PREFERENCE } from './theme-preference.const';

/** One of `THEME_PREFERENCE`. */
export type ThemePreference = (typeof THEME_PREFERENCE)[keyof typeof THEME_PREFERENCE];
