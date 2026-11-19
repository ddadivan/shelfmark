/** Where an import run is: sending batches, finished, or stopped before anything was written. */
export const IMPORT_RUN_PHASE = {
  Idle: 'idle',
  Running: 'running',
  Done: 'done',
  Failed: 'failed',
} as const;
