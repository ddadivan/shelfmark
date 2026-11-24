import type { SettingsNavEntry } from './settings-nav-entry.interface';
import { SETTINGS_PATH } from './settings-path.const';

/** The sections, in the nav order of Shelf 05-settings (Your feedback stays last). */
export const SETTINGS_NAV_ENTRIES: readonly SettingsNavEntry[] = [
  {
    path: SETTINGS_PATH.Account,
    icon: 'user',
    labelKey: 'settings.nav.account',
    descriptionKey: 'settings.description.account',
    phone: false,
  },
  {
    path: SETTINGS_PATH.Appearance,
    icon: 'palette',
    labelKey: 'settings.nav.appearance',
    descriptionKey: 'settings.description.appearance',
    phone: true,
  },
  {
    path: SETTINGS_PATH.Library,
    icon: 'bookmark',
    labelKey: 'settings.nav.library',
    descriptionKey: 'settings.description.library',
    phone: true,
  },
  {
    path: SETTINGS_PATH.Notifications,
    icon: 'bell',
    labelKey: 'settings.nav.notifications',
    descriptionKey: 'settings.description.notifications',
    phone: true,
  },
  {
    path: SETTINGS_PATH.Ai,
    icon: 'spark',
    labelKey: 'settings.nav.ai',
    descriptionKey: 'settings.description.ai',
    phone: true,
  },
  {
    path: SETTINGS_PATH.Language,
    icon: 'globe',
    labelKey: 'settings.nav.language',
    chipKey: 'settings.chips.language',
    descriptionKey: 'settings.description.language',
    phone: true,
  },
  {
    path: SETTINGS_PATH.Privacy,
    icon: 'upload',
    labelKey: 'settings.nav.privacy',
    descriptionKey: 'settings.description.privacy',
    phone: true,
  },
  {
    path: SETTINGS_PATH.Shortcuts,
    icon: 'keyboard',
    labelKey: 'settings.nav.shortcuts',
    chipKey: 'settings.chips.shortcuts',
    descriptionKey: 'settings.description.shortcuts',
    phone: false,
  },
  {
    path: SETTINGS_PATH.Feedback,
    icon: 'message',
    labelKey: 'settings.nav.feedback',
    descriptionKey: 'settings.description.feedback',
    phone: true,
  },
];
