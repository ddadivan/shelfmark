/**
 * Stored job status (`ai_jobs.status`). `running` is internal: the client reads it as `pending`
 * (`AI_JOB_STATUS`).
 */
export const AI_JOB_STATE = {
  Pending: 'pending',
  Running: 'running',
  Done: 'done',
  Failed: 'failed',
  Skipped: 'skipped',
} as const;
