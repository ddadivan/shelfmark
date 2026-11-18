/**
 * State of "Process existing links" (backfill through the Message Batches API, ADR 0049). `stopped`
 * keeps what was done.
 */
export const AI_BACKFILL_STATE = {
  Idle: 'idle',
  Running: 'running',
  Done: 'done',
  Stopped: 'stopped',
} as const;
