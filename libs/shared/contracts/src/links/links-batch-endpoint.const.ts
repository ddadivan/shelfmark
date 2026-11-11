/** Endpoints for several links at once (paste many, #265). */
export const LINKS_BATCH_ENDPOINT = {
  /** `POST`: saves up to `LINK_LIMIT.BatchMax` links in one transaction. */
  Create: '/api/links/batch',
  /** `POST`: deletes up to `LINK_LIMIT.BatchMax` of the user's links (Undo of a batch). */
  Delete: '/api/links/batch/delete',
} as const;
