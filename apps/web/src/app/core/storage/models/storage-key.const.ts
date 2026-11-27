/**
 * Every real `localStorage` key of the app, in one place. The strings are what browsers already
 * hold: renaming one drops the saved choice, so never do. Adding a key means adding its scope in
 * `STORAGE_KEY_SCOPE` too (the compiler asks). `public/boot-skeleton.js` repeats `SessionHint`,
 * `Theme`, `ExtensionBannerDismissed`, `FeedMemory` and `LibraryDefaultView` (checked by `boot-skeleton-script.spec.ts`). Mock-only
 * keys stay next to their mocks.
 */
export const STORAGE_KEY = {
  /** Input preferences (single-key shortcuts). */
  Ui: 'sm-ui',
  /** Desktop Ask panel width. */
  AskWidth: 'sm-ask-width',
  /** Per-feed view and sort. */
  FeedMemory: 'sm-feed-memory',
  /** The account's Default view, kept for the first paint of the boot skeleton (`public/boot-skeleton.js`). */
  LibraryDefaultView: 'sm-library-default-view',
  /** Reading settings, the first paint before the account answers. */
  ReaderSettings: 'sm-reader-settings',
  /** `off` once notifications were turned off on this device while the browser allows them. */
  NotificationsDevice: 'sm-notifications-device',
  /** When "Not now" hid the notification question after a reminder. */
  NotificationsAsked: 'sm-notifications-asked',
  /** This browser's Web Push device id. */
  NotificationsPushDevice: 'sm-notifications-push-device',
  /** Folded desktop sidebar sections. */
  SidebarCollapsed: 'sm-sidebar-collapsed',
  /** The search field's recent searches. */
  RecentSearches: 'sm-recent-searches',
  /** The export dialog's "Last export" line. */
  LastExport: 'sm-last-export',
  /** The folder emoji picker's "Recent". */
  EmojiRecent: 'sm-emoji-recent',
  /** The closed "Install the extension" banner. */
  ExtensionBannerDismissed: 'sm-extension-banner-dismissed',
  /** The folder picker's "Recent" move targets. */
  RecentFolders: 'sm-recent-folders',
  /** First-paint hint that this device has a session. */
  SessionHint: 'sm-session-hint',
  /** The hidden "AI hasn't read N older links yet" row of search. */
  BackfillReminderDismissed: 'sm-backfill-reminder-dismissed',
  /** Latest reminder time the toast announced. */
  RemindersSeen: 'sm-reminders-seen',
  /** Dev and e2e switch: real auth API instead of the mock. */
  RealAuthApi: 'sm-real-auth-api',
  /** Theme preference. */
  Theme: 'sm-theme',
  /** Last text, layout and card options. */
  Layout: 'sm-layout',
  /** Last Animations setting. */
  Motion: 'sm-motion',
  /** Last Custom theme. */
  CustomTheme: 'sm-custom-theme',
  /** Last language settings. */
  Language: 'sm-language',
  /** Width of the link preview list. */
  PreviewWidth: 'sm-preview-width',
  /** Prefix of the "How it works" card state; the user id follows it. */
  HowItWorksPrefix: 'sm-how-it-works:',
} as const;
