import {
  LIBRARY_SETTINGS_DEFAULT,
  isLibrarySort,
  isLibraryView,
  isLinkOpenTarget,
  type LibrarySettings,
} from '@shelfmark/contracts';
import type { LibraryRow } from './models/library-row.interface';

/**
 * Reads the Settings › Library part of the settings. The CHECKs keep the text columns valid; a
 * value that still slips through (a hand edit) falls back to the default. `liveFolder` tells
 * whether `newLinksFolderId` still names a live folder of the user: if not, it reads as Unsorted.
 */
export function toLibrarySettings(row: LibraryRow, liveFolder: boolean): LibrarySettings {
  return {
    defaultView: isLibraryView(row.defaultView)
      ? row.defaultView
      : LIBRARY_SETTINGS_DEFAULT.defaultView,
    defaultSort: isLibrarySort(row.defaultSort)
      ? row.defaultSort
      : LIBRARY_SETTINGS_DEFAULT.defaultSort,
    openLinksIn: isLinkOpenTarget(row.openLinksIn)
      ? row.openLinksIn
      : LIBRARY_SETTINGS_DEFAULT.openLinksIn,
    showFolderCounts: row.showFolderCounts,
    newLinksFolderId: liveFolder ? row.newLinksFolderId : null,
    warnDuplicates: row.warnDuplicates,
    fetchPreviews: row.fetchPreviews,
    keepQuery: row.keepQuery,
  };
}
