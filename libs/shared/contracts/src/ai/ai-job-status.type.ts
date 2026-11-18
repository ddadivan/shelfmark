import type { AI_JOB_STATUS } from './ai-job-status.const';

/** One of `AI_JOB_STATUS`. */
export type AiJobStatus = (typeof AI_JOB_STATUS)[keyof typeof AI_JOB_STATUS];
