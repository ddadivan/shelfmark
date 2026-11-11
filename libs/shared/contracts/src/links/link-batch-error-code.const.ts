/**
 * Why one item of a batch create was skipped (the other items are saved). `UrlTooLong`: the
 * normalised URL is longer than `LINK_LIMIT.UrlMax`. `DuplicateInBatch`: an earlier item of the same
 * batch has the same normalised URL.
 */
export const LINK_BATCH_ERROR_CODE = {
  UrlTooLong: 'url-too-long',
  DuplicateInBatch: 'duplicate-in-batch',
} as const;
