import type { LinkBatchItemError } from './link-batch-item-error.interface';
import type { LinkResponse } from './link-response.interface';

/**
 * `POST /api/links/batch` response: 201 when the request created at least one link, 200 when every
 * key was replayed. The image paths of new links carry the pending marker until the capture ran.
 */
export interface CreateLinksBatchResponse {
  /** The saved links in request order (created now or replayed by key), skipped items left out. */
  links: LinkResponse[];
  /** Items that were skipped, in request order. */
  errors: LinkBatchItemError[];
}
