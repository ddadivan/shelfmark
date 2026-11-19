import type { LinkBatchItemError } from '../links/link-batch-item-error.interface';

/** `POST /api/imports/:id/links` response: counts, not the links. */
export interface ImportLinksResponse {
  /** Links this request created. */
  created: number;
  /** Links an earlier try of the same batch had created (known idempotency keys). */
  replayed: number;
  /** Items that were not saved. */
  errors: LinkBatchItemError[];
}
