import type { LinkResponse } from './link-response.interface';

/** `POST /api/links/batch/update` response. */
export interface UpdateLinksBatchResponse {
  /** How many of the user's live links the request matched (and changed). */
  updated: number;
  /** Those links as they are now, in request order. */
  links: LinkResponse[];
}
