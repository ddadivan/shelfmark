/** How a saved view write ended: done, refused at the limit (409), the folder is gone (404), or failed. */
export const VIEW_OUTCOME = {
  Done: 'done',
  Limit: 'limit',
  Missing: 'missing',
  Failed: 'failed',
} as const;
