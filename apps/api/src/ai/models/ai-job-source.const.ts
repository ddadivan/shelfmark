/** What started a link job (`ai_jobs.source`). Only `save` and `draft` jobs may auto-apply. */
export const AI_JOB_SOURCE = {
  Save: 'save',
  Draft: 'draft',
  Backfill: 'backfill',
  Rewrite: 'rewrite',
} as const;
