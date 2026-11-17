import type { AI_FEATURE_MODE } from './ai-feature-mode.const';

/** One of `AI_FEATURE_MODE`. */
export type AiFeatureMode = (typeof AI_FEATURE_MODE)[keyof typeof AI_FEATURE_MODE];
