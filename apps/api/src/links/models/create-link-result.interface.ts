import type { LinkResponse } from '@shelfmark/contracts';

/** Outcome of `POST /links`: the link, and whether this request created it (`false` = idempotent replay). */
export interface CreateLinkResult {
  link: LinkResponse;
  created: boolean;
}
