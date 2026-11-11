import type { THEME_PICKER_KIND } from './theme-picker-kind.const';

/** One of `THEME_PICKER_KIND`. */
export type ThemePickerKind = (typeof THEME_PICKER_KIND)[keyof typeof THEME_PICKER_KIND];
