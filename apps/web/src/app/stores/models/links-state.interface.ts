import type { LinkResponse } from '@shelfmark/contracts';
import type { LinksFilter } from '../../features/links/models/links-filter.type';

/** State of `LinksStore` besides the link entities. */
export interface LinksState {
  /** What the entities were loaded for. */
  filter: LinksFilter;
  /** Cursor of the next page; `null` on the last one. */
  nextCursor: string | null;
  /** The first page of the current scope has arrived. */
  loaded: boolean;
  /** A page-one request is running (first load or refetch). */
  loading: boolean;
  loadingMore: boolean;
  /** The last page-one request failed. */
  error: boolean;
  /** The last "load more" failed; the button stays so the user can retry. */
  loadMoreFailed: boolean;
  /** "Recently opened", newest first. */
  recent: LinkResponse[];
  recentLoaded: boolean;
  /**
   * Links that were just saved and play the "card lands" motion, by id, with their place in the
   * stagger (0 first). Cleared after the motion, so a card that scrolls back into view does not
   * land again.
   */
  landed: Readonly<Record<string, number>>;
}
