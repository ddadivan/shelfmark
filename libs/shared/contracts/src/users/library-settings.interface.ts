import type { LibrarySort } from './library-sort.type';
import type { LibraryView } from './library-view.type';
import type { LinkOpenTarget } from './link-open-target.type';

/** Settings › Library › Viewing and Saving (#284), part of `UserSettingsResponse`. */
export interface LibrarySettings {
  /** How a feed opens the first time. Default `cards`. */
  defaultView: LibraryView;
  /** The sort a feed starts with until the person picks another one there. Default `newest`. */
  defaultSort: LibrarySort;
  /** Where the link of a card or row opens. Default `new-tab`. */
  openLinksIn: LinkOpenTarget;
  /** Link counts next to the sidebar entries and folders. Default on. */
  showFolderCounts: boolean;
  /**
   * The folder the add-link dialog starts with when the page has none ("New links go to");
   * `null` is Unsorted. The server answers `null` once that folder is gone or in Trash.
   */
  newLinksFolderId: string | null;
  /** The add-link dialog shows where the same link is saved already. Default on. */
  warnDuplicates: boolean;
  /**
   * Off: a new link keeps only its address. The web app skips the preview fetch and the server
   * neither loads the page nor captures images for this user's new links. Default on.
   */
  fetchPreviews: boolean;
  /**
   * Off: tracking parameters (`TRACKING_QUERY_PARAMS`, `utm_*`) are removed from the address of a
   * link when it is saved; every other parameter stays as written. Default off.
   */
  keepQuery: boolean;
}
