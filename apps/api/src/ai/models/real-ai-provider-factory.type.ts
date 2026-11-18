import type { AiConfig } from './ai-config.interface';
import type { AiProvider } from './ai-provider.interface';

/** Builds the real provider from the boot configuration; called at most once, never in tests. */
export type RealAiProviderFactory = (config: AiConfig) => AiProvider;
