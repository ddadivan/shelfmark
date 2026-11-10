import type { SettingsNavEntry } from './settings-nav-entry.interface';
import { SETTINGS_PATH } from './settings-path.const';

/** The sections that exist today, in nav order. */
export const SETTINGS_NAV_ENTRIES: readonly SettingsNavEntry[] = [
  {
    path: SETTINGS_PATH.Account,
    labelKey: 'settings.nav.account',
    descriptionKey: 'settings.description.account',
    phone: false,
  },
  {
    path: SETTINGS_PATH.Appearance,
    labelKey: 'settings.nav.appearance',
    descriptionKey: 'settings.description.appearance',
    phone: true,
  },
  {
    path: SETTINGS_PATH.Shortcuts,
    labelKey: 'settings.nav.shortcuts',
    descriptionKey: 'settings.description.shortcuts',
    phone: false,
  },
  {
    path: SETTINGS_PATH.ImportExport,
    labelKey: 'settings.nav.export',
    descriptionKey: 'settings.description.export',
    phone: true,
  },
  {
    path: SETTINGS_PATH.Privacy,
    labelKey: 'settings.nav.privacy',
    descriptionKey: 'settings.description.privacy',
    phone: true,
  },
];
