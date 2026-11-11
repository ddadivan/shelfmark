/** Child paths of `/settings`: one page per section. */
export const SETTINGS_PATH = {
  Account: 'account',
  Appearance: 'appearance',
  /** What happens to deleted items (Trash). */
  Library: 'library',
  /** Your feedback: the send form and the user's messages. */
  Feedback: 'feedback',
  /** Only export exists today; the path is the one an import would join. */
  ImportExport: 'import-export',
  Privacy: 'privacy',
  Shortcuts: 'shortcuts',
} as const;
