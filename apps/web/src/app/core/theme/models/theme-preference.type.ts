import type { THEME_PREFERENCE } from './theme-preference.const';

export type ThemePreference = (typeof THEME_PREFERENCE)[keyof typeof THEME_PREFERENCE];
