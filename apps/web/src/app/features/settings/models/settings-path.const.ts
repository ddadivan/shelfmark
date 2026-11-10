/** Child paths of `/settings`: one page per section. */
export const SETTINGS_PATH = {
  Account: 'account',
  Appearance: 'appearance',
  /** Only export exists today; the path is the one an import would join. */
  ImportExport: 'import-export',
  Privacy: 'privacy',
  Shortcuts: 'shortcuts',
} as const;
