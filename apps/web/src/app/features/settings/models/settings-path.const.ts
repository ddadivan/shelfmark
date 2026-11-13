/** Child paths of `/settings`: one page per section. */
export const SETTINGS_PATH = {
  Account: 'account',
  Appearance: 'appearance',
  /** What happens to deleted items (Trash). */
  Library: 'library',
  /** Interface language, date format, clock, week start and spell-check (#274). */
  Language: 'language',
  /** Your feedback: the send form and the user's messages. */
  Feedback: 'feedback',
  /** The old Export page (#352: export lives in Account › Your data); only redirects there. */
  ImportExport: 'import-export',
  Privacy: 'privacy',
  Shortcuts: 'shortcuts',
} as const;
