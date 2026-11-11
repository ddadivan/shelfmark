import {
  LIBRARY_SETTINGS_DEFAULT,
  isLibrarySort,
  isLibraryView,
  isLinkOpenTarget,
  type LibrarySettings,
} from '@shelfmark/contracts';
import { MOCK_LIBRARY_SETTINGS_STORAGE_KEY } from '../models/mock-library-settings-storage-key.const';

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * The mock account's Settings › Library choices from `localStorage` (mock builds only), so a
 * reload sees them like it would see the server's; anything missing or broken is the default.
 */
export function readMockLibrarySettings(storage: Storage | undefined): LibrarySettings {
  let stored: Partial<Record<keyof LibrarySettings, unknown>> = {};
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(MOCK_LIBRARY_SETTINGS_STORAGE_KEY) ?? '{}');
    if (typeof parsed === 'object' && parsed !== null) {
      stored = parsed;
    }
  } catch {
    // Missing, blocked or broken storage: the defaults below.
  }
  const d = LIBRARY_SETTINGS_DEFAULT;
  return {
    defaultView: isLibraryView(stored.defaultView) ? stored.defaultView : d.defaultView,
    defaultSort: isLibrarySort(stored.defaultSort) ? stored.defaultSort : d.defaultSort,
    openLinksIn: isLinkOpenTarget(stored.openLinksIn) ? stored.openLinksIn : d.openLinksIn,
    showFolderCounts: flag(stored.showFolderCounts, d.showFolderCounts),
    newLinksFolderId:
      typeof stored.newLinksFolderId === 'string' ? stored.newLinksFolderId : d.newLinksFolderId,
    warnDuplicates: flag(stored.warnDuplicates, d.warnDuplicates),
    fetchPreviews: flag(stored.fetchPreviews, d.fetchPreviews),
    keepQuery: flag(stored.keepQuery, d.keepQuery),
  };
}

/** Stores the mock account's Settings › Library choices; a blocked storage keeps nothing. */
export function writeMockLibrarySettings(
  storage: Storage | undefined,
  settings: LibrarySettings,
): void {
  try {
    storage?.setItem(MOCK_LIBRARY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable: the change lasts until the next read.
  }
}
