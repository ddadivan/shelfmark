import { CUSTOM_THEME_DEFAULT } from '../users/custom-theme-default.const';
import { MOTION_PREFERENCE } from '../users/motion-preference.const';
import { THEME_PREFERENCE } from '../users/theme-preference.const';
import type { UserSettingsResponse } from '../users/user-settings-response.interface';

/** The appearance part of a new account's `UserSettingsResponse` (spread it into fixtures). */
export const MOCK_APPEARANCE_DEFAULTS: Pick<
  UserSettingsResponse,
  'theme' | 'customTheme' | 'motion'
> = {
  theme: THEME_PREFERENCE.System,
  customTheme: CUSTOM_THEME_DEFAULT,
  motion: MOTION_PREFERENCE.System,
};
