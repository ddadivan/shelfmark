import type { AI_JOB_STATE } from './ai-job-state.const';

export type AiJobState = (typeof AI_JOB_STATE)[keyof typeof AI_JOB_STATE];
