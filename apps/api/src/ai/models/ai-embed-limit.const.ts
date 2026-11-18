/**
 * The embed pass (ADR 0050 point 4): at most `ChunkSize` links per provider call, newest first; the
 * per-user lease on `ai_settings` lasts `LeaseSeconds` (longer than a chunk with its 8 s call) and is
 * renewed per chunk; a kick after a save works for `KickBudgetMs`. After a failure the pass waits
 * `BackoffSeconds` by the number of failures in a row; after `NonRetryableMax` failures in a row that
 * cannot be retried (a 4xx, a malformed answer) it waits `NonRetryableBackoffSeconds` and warns once.
 * The status reads `unavailable` while the last failure is younger than `UnavailableWindowMs`. Meaning results need `ReadyShareMin` of the live
 * links with a current vector. The embedded text is at most `TextMax` characters.
 */
export const AI_EMBED_LIMIT = {
  ChunkSize: 64,
  LeaseSeconds: 60,
  KickBudgetMs: 15_000,
  BackoffSeconds: [30, 120, 600],
  NonRetryableMax: 3,
  NonRetryableBackoffSeconds: 6 * 60 * 60,
  UnavailableWindowMs: 15 * 60_000,
  ReadyShareMin: 0.8,
  TextMax: 2000,
} as const;
