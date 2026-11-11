import {
  LIBRARY_SETTINGS_DEFAULT,
  LIBRARY_SORT,
  LIBRARY_VIEW,
  LINK_OPEN_TARGET,
} from '@shelfmark/contracts';
import type { LibraryRow } from './models/library-row.interface';
import { toLibrarySettings } from './to-library-settings';

const row: LibraryRow = {
  defaultView: LIBRARY_VIEW.List,
  defaultSort: LIBRARY_SORT.Title,
  openLinksIn: LINK_OPEN_TARGET.SameTab,
  showFolderCounts: false,
  newLinksFolderId: '0190a000-0000-7000-8000-000000000001',
  warnDuplicates: false,
  fetchPreviews: false,
  keepQuery: true,
};

describe('toLibrarySettings', () => {
  it('reads every column as it is', () => {
    expect(toLibrarySettings(row, true)).toEqual(row);
  });

  it('reads a folder that is gone as Unsorted', () => {
    expect(toLibrarySettings(row, false).newLinksFolderId).toBeNull();
  });

  it('falls back to the defaults for values past the CHECKs', () => {
    const settings = toLibrarySettings(
      { ...row, defaultView: 'grid', defaultSort: 'random', openLinksIn: 'popup' },
      true,
    );
    expect(settings.defaultView).toBe(LIBRARY_SETTINGS_DEFAULT.defaultView);
    expect(settings.defaultSort).toBe(LIBRARY_SETTINGS_DEFAULT.defaultSort);
    expect(settings.openLinksIn).toBe(LIBRARY_SETTINGS_DEFAULT.openLinksIn);
  });
});
