import type { AI_TIER } from './ai-tier.const';

/** One of `AI_TIER`. */
export type AiTier = (typeof AI_TIER)[keyof typeof AI_TIER];
