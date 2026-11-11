/** How a Trash write ended: it worked, the library is full (409 on restore) or it failed. */
export const TRASH_OUTCOME = {
  Done: 'done',
  Conflict: 'conflict',
  Failed: 'failed',
} as const;
