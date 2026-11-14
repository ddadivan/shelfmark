import type { CUSTOM_THEME_ACCENT } from './custom-theme-accent.const';

/** One of `CUSTOM_THEME_ACCENT`. */
export type CustomThemeAccent = (typeof CUSTOM_THEME_ACCENT)[keyof typeof CUSTOM_THEME_ACCENT];
