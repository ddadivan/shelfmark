/** `idle`: nothing rendered; `running`: indeterminate; `done`: filled to 100% and fading out. */
export const PROGRESS_BAR_PHASE = {
  Idle: 'idle',
  Running: 'running',
  Done: 'done',
} as const;
