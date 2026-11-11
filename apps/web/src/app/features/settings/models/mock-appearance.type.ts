import type { UserSettingsResponse } from '@shelfmark/contracts';

/** The appearance part of the mock account settings, as `MockUserSettingsApi` stores it. */
export type MockAppearance = Pick<UserSettingsResponse, 'theme' | 'customTheme' | 'motion'>;
