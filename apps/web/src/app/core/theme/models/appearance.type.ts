import type { LayoutSettings, UserSettingsResponse } from '@shelfmark/contracts';

/**
 * What ThemeService applies: the appearance part of the account settings (theme, Custom theme,
 * Animations, and the text, layout and card options of #285).
 */
export type Appearance = Pick<UserSettingsResponse, 'theme' | 'customTheme' | 'motion'> &
  LayoutSettings;
