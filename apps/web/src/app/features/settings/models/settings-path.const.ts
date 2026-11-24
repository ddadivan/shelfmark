/** Child paths of `/settings`: one page per section. */
export const SETTINGS_PATH = {
  Account: 'account',
  Appearance: 'appearance',
  /** What happens to deleted items (Trash). */
  Library: 'library',
  /** Browser notifications and what Shelfmark may send (Shelf 05-settings, 12-notify). */
  Notifications: 'notifications',
  /** AI features, usage, existing links and AI data (#389); phone sub-pages `ai/folder`, `ai/tags`. */
  Ai: 'ai',
  /** Interface language, date format, clock, week start and spell-check (#274). */
  Language: 'language',
  /** Your feedback: the send form and the user's messages. */
  Feedback: 'feedback',
  /** The old Export page (#352: export lives in Account › Your data); only redirects there. */
  ImportExport: 'import-export',
  Privacy: 'privacy',
  Shortcuts: 'shortcuts',
} as const;
