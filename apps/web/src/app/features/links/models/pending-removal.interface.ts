import type { LinkResponse } from '@shelfmark/contracts';

/** A link removed from the feed while its Undo window is open. */
export interface PendingRemoval {
  readonly link: LinkResponse;
  /** Position in the feed, to put it back in place. */
  readonly index: number;
  /** Position in the recent panel, or -1. */
  readonly recentIndex: number;
  /** The delete request is on its way. */
  committing: boolean;
}
