import type { AI_PROVIDER_NAME } from './ai-provider-name.const';

export type AiProviderName = (typeof AI_PROVIDER_NAME)[keyof typeof AI_PROVIDER_NAME];
