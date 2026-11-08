/** How a tag mutation ended. */
export const TAG_OUTCOME = {
  Done: 'done',
  /** The name is taken by another tag (409). */
  Conflict: 'conflict',
  Failed: 'failed',
} as const;
