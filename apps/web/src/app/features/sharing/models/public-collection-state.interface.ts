import type { PublicCollectionLink, PublicCollectionResponse } from '@shelfmark/contracts';

/** State of `PublicCollectionStore`: the collection a `/c/:token` page shows. */
export interface PublicCollectionState {
  token: string | null;
  /** The subfolder chip that is on; `null` = All. */
  folder: string | null;
  /** The last page answered (header data, subfolders, counts). */
  collection: PublicCollectionResponse | null;
  /** Every link loaded so far for the current filter. */
  items: PublicCollectionLink[];
  loading: boolean;
  loadingMore: boolean;
  /** The token is unknown, turned off or reset. */
  notFound: boolean;
  /** Any other failure (offline, 429, 5xx). */
  failed: boolean;
}
