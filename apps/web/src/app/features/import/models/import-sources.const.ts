import { IMPORT_SOURCE } from '@shelfmark/contracts';
import { parseNetscapeBookmarks } from '../utils/parse-netscape-bookmarks';
import type { ImportSourceOption } from './import-source-option.interface';

/**
 * The sources of the import dialog, in the order shown (ADR 0056). Pocket, Raindrop.io, the
 * Shelfmark backup and a plain list of URLs join here with their parsers.
 */
export const IMPORT_SOURCES: readonly ImportSourceOption[] = [
  {
    id: IMPORT_SOURCE.Browser,
    titleKey: 'import.source.browser.title',
    descriptionKey: 'import.source.browser.description',
    accept: '.html,.htm,text/html',
    parse: (text, untitled) => parseNetscapeBookmarks(text, untitled),
  },
];
