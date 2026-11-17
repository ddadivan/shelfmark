import type { CreateLinksBatchItem } from './create-links-batch-item.interface';

/** `POST /api/links/batch` body: several links pasted at once, saved in one transaction. */
export interface CreateLinksBatchRequest {
  /** 1 to `LINK_LIMIT.BatchMax` links. Duplicates of saved links are allowed ("save anyway"). */
  items: CreateLinksBatchItem[];
  /** UUID of one of the user's folders, for every link; absent = "Unsorted". */
  folderId?: string;
  /** Tag names for every link, the same rules as `CreateLinkRequest.tags`. */
  tags?: string[];
  /**
   * Domain rules (#398), default `true`: for every item that leaves them open (no folder of its own or
   * of the batch, no tags of its own or of the batch) the matching rule fills folder and tags.
   * `false` when the client showed the rules per line and sends what it showed.
   */
  applyRules?: boolean;
}
