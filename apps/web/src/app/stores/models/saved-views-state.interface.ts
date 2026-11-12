import type { SavedViewResponse } from '@shelfmark/contracts';

/** State of `SavedViewsStore`. */
export interface SavedViewsState {
  /** The views in order (what the API answered, plus optimistic changes). */
  items: SavedViewResponse[];
  /** All live links: the count of the fixed "All" chip; `null` until the first list. */
  total: number | null;
  /** The first list has arrived. */
  loaded: boolean;
  /** Key of the feed the counts and `total` belong to (`''` = the whole library). */
  feedKey: string;
  loading: boolean;
  /** The first list failed. */
  error: boolean;
}
