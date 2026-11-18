/**
 * Who wrote a link's summary (#391): `ai` carries the AI mark and may be rewritten by AI; `user`
 * (any edit) is the user's text and is never overwritten by reprocessing or backfill.
 */
export const SUMMARY_SOURCE = {
  Ai: 'ai',
  User: 'user',
} as const;
