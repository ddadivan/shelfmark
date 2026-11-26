import { APP_PATH } from '../../../models/app-path.const';
import { SETTINGS_PATH } from '../../settings/models/settings-path.const';
import type { HelpArticleLink } from './help-article-link.interface';

/** Every place a help article can send the reader to; labels are `help.links.<name>` in each language. */
export const HELP_LINK = {
  Library: { route: `/${APP_PATH.Links}`, labelKey: 'help.links.library', icon: 'home' },
  Unsorted: { route: `/${APP_PATH.Unsorted}`, labelKey: 'help.links.unsorted', icon: 'inbox' },
  Favorites: { route: `/${APP_PATH.Favorites}`, labelKey: 'help.links.favorites', icon: 'star' },
  Tags: { route: `/${APP_PATH.Tags}`, labelKey: 'help.links.tags', icon: 'tag' },
  Today: { route: `/${APP_PATH.Today}`, labelKey: 'help.links.today', icon: 'calendar' },
  Reminders: { route: `/${APP_PATH.Reminders}`, labelKey: 'help.links.reminders', icon: 'bell' },
  Recent: { route: `/${APP_PATH.Recent}`, labelKey: 'help.links.recent', icon: 'history' },
  Trash: { route: `/${APP_PATH.Trash}`, labelKey: 'help.links.trash', icon: 'trash' },
  Import: { route: `/${APP_PATH.Import}`, labelKey: 'help.links.import', icon: 'upload' },
  Ask: { route: `/${APP_PATH.Ask}`, labelKey: 'help.links.ask', icon: 'spark' },
  SettingsAccount: {
    route: `/${APP_PATH.Settings}/${SETTINGS_PATH.Account}`,
    labelKey: 'help.links.settingsAccount',
    icon: 'user',
  },
  SettingsAppearance: {
    route: `/${APP_PATH.Settings}/${SETTINGS_PATH.Appearance}`,
    labelKey: 'help.links.settingsAppearance',
    icon: 'palette',
  },
  SettingsLibrary: {
    route: `/${APP_PATH.Settings}/${SETTINGS_PATH.Library}`,
    labelKey: 'help.links.settingsLibrary',
    icon: 'bookmark',
  },
  SettingsNotifications: {
    route: `/${APP_PATH.Settings}/${SETTINGS_PATH.Notifications}`,
    labelKey: 'help.links.settingsNotifications',
    icon: 'bell',
  },
  SettingsAi: {
    route: `/${APP_PATH.Settings}/${SETTINGS_PATH.Ai}`,
    labelKey: 'help.links.settingsAi',
    icon: 'spark',
  },
  SettingsData: {
    route: `/${APP_PATH.Settings}/${SETTINGS_PATH.Privacy}`,
    labelKey: 'help.links.settingsData',
    icon: 'download',
  },
  SettingsShortcuts: {
    route: `/${APP_PATH.Settings}/${SETTINGS_PATH.Shortcuts}`,
    labelKey: 'help.links.settingsShortcuts',
    icon: 'keyboard',
  },
} as const satisfies Record<string, HelpArticleLink>;
