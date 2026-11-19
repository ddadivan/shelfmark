import type { CreateLinksBatchResponse } from '@shelfmark/contracts';

/** Outcome of `POST /links/batch`: the response, and whether this request created any link. */
export interface CreateLinksBatchResult {
  response: CreateLinksBatchResponse;
  created: boolean;
  /** Links this request created. */
  createdCount: number;
  /** Links an earlier try of the same keys had created. */
  replayedCount: number;
}
