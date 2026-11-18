import type { AI_PROVIDER_STATUS } from './ai-provider-status.const';

/** One of `AI_PROVIDER_STATUS`. */
export type AiProviderStatus = (typeof AI_PROVIDER_STATUS)[keyof typeof AI_PROVIDER_STATUS];
