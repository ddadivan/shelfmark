/**
 * The follow-up of links saved together (paste many): the feed reloads every `RefreshMs` while
 * any of them is pending, for at most `WindowMs` after the latest batch (two AI tick intervals).
 */
export const AI_BATCH_FOLLOW_UP = {
  RefreshMs: 5000,
  WindowMs: 30_000,
} as const;
