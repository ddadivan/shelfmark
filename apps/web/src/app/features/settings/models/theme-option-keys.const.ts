import type { ThemePreference } from '@shelfmark/contracts';

/** Translation key of the label of each theme choice. */
export const THEME_OPTION_KEYS: Record<ThemePreference, string> = {
  system: 'settings.appearance.theme.system',
  light: 'settings.appearance.theme.light',
  dark: 'settings.appearance.theme.dark',
  custom: 'settings.appearance.theme.custom',
};
