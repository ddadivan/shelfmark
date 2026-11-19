/** Why a chosen file cannot be imported (shown in the source step). */
export const IMPORT_FILE_PROBLEM = {
  TooBig: 'too-big',
  Unreadable: 'unreadable',
  NotBookmarks: 'not-bookmarks',
  Empty: 'empty',
  TooManyLinks: 'too-many-links',
  CheckFailed: 'check-failed',
} as const;
