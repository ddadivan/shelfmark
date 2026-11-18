/** How one chunk of the embed pass ended: more may follow, nothing left, quota used up, or failed. */
export const EMBED_CHUNK_RESULT = {
  More: 'more',
  Done: 'done',
  Quota: 'quota',
  Failed: 'failed',
} as const;
