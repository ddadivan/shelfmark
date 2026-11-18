import type { AI_APPLIED_PART } from './ai-applied-part.const';

/** One of `AI_APPLIED_PART`. */
export type AiAppliedPart = (typeof AI_APPLIED_PART)[keyof typeof AI_APPLIED_PART];
