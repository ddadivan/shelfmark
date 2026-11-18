import type { AI_JOB_SOURCE } from './ai-job-source.const';

export type AiJobSource = (typeof AI_JOB_SOURCE)[keyof typeof AI_JOB_SOURCE];
