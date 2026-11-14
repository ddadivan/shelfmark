import type { SplitTarget } from './split-target.type';

/** State of `SplitFeedStore` besides the link entities. */
export interface SplitFeedState {
  /** What the entities were loaded for; `undefined` while the right half shows no feed. */
  target: SplitTarget;
  /** Cursor of the next page; `null` on the last one. */
  nextCursor: string | null;
  /** The first page of the target has arrived. */
  loaded: boolean;
  /** A page-one request is running (first load or refetch). */
  loading: boolean;
  loadingMore: boolean;
  /** The last page-one request failed. */
  error: boolean;
  /** The last "load more" failed; the button stays so the user can retry. */
  loadMoreFailed: boolean;
}
