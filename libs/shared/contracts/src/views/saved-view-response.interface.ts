import type { SavedViewIcon } from './saved-view-icon.type';
import type { SavedViewQuery } from './saved-view-query.interface';

/** A saved view with the number of live links it matches now. */
export interface SavedViewResponse {
  id: string;
  /** 1 to `SAVED_VIEW_LIMIT.NameMax` characters. */
  name: string;
  /** The view's glyph (`SAVED_VIEW_ICON`); `null` = the default one. */
  icon: SavedViewIcon | null;
  query: SavedViewQuery;
  /** 0-based place among the user's views. */
  position: number;
  /** Live links matching `query`; `0` when the view is not `available`. */
  count: number;
  /** `false` when the folder of a folder view is in Trash or gone: the view cannot be applied until it is restored. */
  available: boolean;
}
