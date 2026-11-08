import { EXPORT_FORMAT } from '@shelfmark/contracts';

/** Fallback file names when the response carries no `Content-Disposition`. */
export const EXPORT_FILE_NAME = {
  [EXPORT_FORMAT.Json]: 'shelfmark-export.json',
  [EXPORT_FORMAT.Html]: 'shelfmark-bookmarks.html',
} as const;
