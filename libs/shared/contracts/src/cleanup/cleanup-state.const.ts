/**
 * State of the user's stored clean-up report: `none` before the first run, `running` while the
 * deferred AI checks continue, `ready` with results, `applied` after "Apply", `failed` when a run
 * stalled for a day (what it found is kept).
 */
export const CLEANUP_STATE = {
  None: 'none',
  Running: 'running',
  Ready: 'ready',
  Applied: 'applied',
  Failed: 'failed',
} as const;
