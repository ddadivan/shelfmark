import type { TrashItem } from '@shelfmark/contracts';

/** State of `TrashStore`. */
export interface TrashState {
  /** The newest entries, newest first (the API list, at most `TRASH_LIMIT.ListMax`). */
  items: TrashItem[];
  /** Every entry in Trash, also those beyond the list. */
  total: number;
  /** The first list has arrived. */
  loaded: boolean;
  loading: boolean;
  /** The first list failed; the page offers a retry. */
  error: boolean;
}
