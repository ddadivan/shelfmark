import type { CUSTOM_THEME_CORNERS } from './custom-theme-corners.const';

/** One of `CUSTOM_THEME_CORNERS`. */
export type CustomThemeCorners = (typeof CUSTOM_THEME_CORNERS)[keyof typeof CUSTOM_THEME_CORNERS];
