import { THEME_PREFERENCE } from './models/theme-preference.const';
import type { ThemePreference } from './models/theme-preference.type';

export function isThemePreference(value: string): value is ThemePreference {
  return Object.values<string>(THEME_PREFERENCE).includes(value);
}
