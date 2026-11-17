/**
 * State of a link's AI job as the client sees it (ADR 0048). The API's internal `running` reads as
 * `pending`. `failed` and `skipped` render nothing: the link looks as it does without AI.
 */
export const AI_JOB_STATUS = {
  Pending: 'pending',
  Done: 'done',
  Failed: 'failed',
  Skipped: 'skipped',
} as const;
