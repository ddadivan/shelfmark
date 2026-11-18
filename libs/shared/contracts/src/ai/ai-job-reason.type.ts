import type { AI_JOB_REASON } from './ai-job-reason.const';

/** One of `AI_JOB_REASON`. */
export type AiJobReason = (typeof AI_JOB_REASON)[keyof typeof AI_JOB_REASON];
