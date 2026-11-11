import { LIBRARY_SORT } from './library-sort.const';
import { LIBRARY_VIEW } from './library-view.const';
import type { LibrarySettings } from './library-settings.interface';
import { LINK_OPEN_TARGET } from './link-open-target.const';

/** What a new account has (SetLibrary mockup) and what the web shows until the settings load. */
export const LIBRARY_SETTINGS_DEFAULT: Readonly<LibrarySettings> = {
  defaultView: LIBRARY_VIEW.Cards,
  defaultSort: LIBRARY_SORT.Newest,
  openLinksIn: LINK_OPEN_TARGET.NewTab,
  showFolderCounts: true,
  newLinksFolderId: null,
  warnDuplicates: true,
  fetchPreviews: true,
  keepQuery: false,
};
