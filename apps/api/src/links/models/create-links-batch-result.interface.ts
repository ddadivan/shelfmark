import type { CreateLinksBatchResponse } from '@shelfmark/contracts';

/** Outcome of `POST /links/batch`: the response, and whether this request created any link. */
export interface CreateLinksBatchResult {
  response: CreateLinksBatchResponse;
  created: boolean;
}
