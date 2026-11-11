import type { UserSettingsResponse } from '@shelfmark/contracts';

/** What ThemeService applies: the appearance part of the account settings. */
export type Appearance = Pick<UserSettingsResponse, 'theme' | 'customTheme' | 'motion'>;
