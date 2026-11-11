import { CUSTOM_THEME_DEFAULT } from '../users/custom-theme-default.const';
import type { LanguageSettings } from '../users/language-settings.interface';
import { LANGUAGE_SETTINGS_DEFAULT } from '../users/language-settings-default.const';
import type { LayoutSettings } from '../users/layout-settings.interface';
import { LAYOUT_SETTINGS_DEFAULT } from '../users/layout-settings-default.const';
import { MOTION_PREFERENCE } from '../users/motion-preference.const';
import { THEME_PREFERENCE } from '../users/theme-preference.const';
import type { UserSettingsResponse } from '../users/user-settings-response.interface';

/**
 * The appearance and language parts (never saved) of a new account's `UserSettingsResponse`
 * (spread it into fixtures).
 */
export const MOCK_APPEARANCE_DEFAULTS: Pick<
  UserSettingsResponse,
  'theme' | 'customTheme' | 'motion' | 'appearanceSaved' | 'languageSaved'
> &
  LayoutSettings &
  LanguageSettings = {
  theme: THEME_PREFERENCE.System,
  customTheme: CUSTOM_THEME_DEFAULT,
  motion: MOTION_PREFERENCE.System,
  appearanceSaved: false,
  ...LAYOUT_SETTINGS_DEFAULT,
  ...LANGUAGE_SETTINGS_DEFAULT,
  languageSaved: false,
};
