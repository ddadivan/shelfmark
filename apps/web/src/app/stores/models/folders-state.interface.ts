import type { LibraryCounts } from '@shelfmark/contracts';

/** State of `FoldersStore` besides the folder entities. */
export interface FoldersState {
  /** Counts of the fixed sidebar rows. */
  counts: LibraryCounts;
  /** The first list has arrived. */
  loaded: boolean;
  loading: boolean;
  /** The first list failed; the sidebar offers a retry. */
  error: boolean;
}
