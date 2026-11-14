import type { PublicCollectionFolder } from './public-collection-folder.interface';
import type { PublicCollectionLink } from './public-collection-link.interface';

/**
 * `GET /api/public/collections/:token`: a shared folder and its subtree, read-only. No email, no
 * user id, no folder ids above the shared folder.
 */
export interface PublicCollectionResponse {
  /** The owner's first name only. */
  ownerName: string;
  name: string;
  /** Links in the whole shared subtree (the page lists at most `SHARE_LIMIT.MaxLinks`). */
  linkCount: number;
  /** The latest change of the folders or links in the subtree. */
  updatedAt: string;
  /** Direct subfolders, by name. */
  subfolders: PublicCollectionFolder[];
  /** Newest first. */
  items: PublicCollectionLink[];
  page: number;
  hasMore: boolean;
}
