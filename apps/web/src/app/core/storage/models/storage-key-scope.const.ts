import { STORAGE_SCOPE } from './storage-scope.const';
import type { StorageKeyName } from './storage-key-name.type';
import type { StorageScope } from './storage-scope.type';

/**
 * The scope of every `STORAGE_KEY`; a new key does not compile without one. `User` keys are
 * removed when the session ends (`USER_STORAGE_KEYS`).
 */
export const STORAGE_KEY_SCOPE: Readonly<Record<StorageKeyName, StorageScope>> = {
  Ui: STORAGE_SCOPE.Device,
  AskWidth: STORAGE_SCOPE.Device,
  FeedMemory: STORAGE_SCOPE.Device,
  ReaderSettings: STORAGE_SCOPE.Device,
  NotificationsDevice: STORAGE_SCOPE.Device,
  NotificationsAsked: STORAGE_SCOPE.Device,
  NotificationsPushDevice: STORAGE_SCOPE.User,
  SidebarCollapsed: STORAGE_SCOPE.Device,
  RecentSearches: STORAGE_SCOPE.User,
  LastExport: STORAGE_SCOPE.User,
  EmojiRecent: STORAGE_SCOPE.User,
  ExtensionBannerDismissed: STORAGE_SCOPE.User,
  RecentFolders: STORAGE_SCOPE.User,
  SessionHint: STORAGE_SCOPE.User,
  BackfillReminderDismissed: STORAGE_SCOPE.User,
  RemindersSeen: STORAGE_SCOPE.User,
  RealAuthApi: STORAGE_SCOPE.Device,
  Theme: STORAGE_SCOPE.Device,
  Layout: STORAGE_SCOPE.Device,
  Motion: STORAGE_SCOPE.Device,
  CustomTheme: STORAGE_SCOPE.Device,
  Language: STORAGE_SCOPE.Device,
  PreviewWidth: STORAGE_SCOPE.Device,
  HowItWorksPrefix: STORAGE_SCOPE.Device,
};
