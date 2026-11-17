import { Inject, Injectable } from '@nestjs/common';
import { AI_CONFIG } from '../models/ai-config.token';
import { AI_PROVIDER_NAME } from '../models/ai-provider-name.const';
import { REAL_AI_PROVIDER_FACTORY } from '../models/real-ai-provider-factory.token';
import { MockAiProvider } from './mock-ai.provider';
import { MockEmbeddingProvider } from './mock-embedding.provider';
import { createVoyageEmbeddingProvider } from './voyage-embedding.provider';
import type { AiConfig } from '../models/ai-config.interface';
import type { AiProvider } from '../models/ai-provider.interface';
import type { EmbeddingProvider } from '../models/embedding-provider.interface';
import type { RealAiProviderFactory } from '../models/real-ai-provider-factory.type';

/**
 * Decides which provider answers for a user (ADR 0047 point 5): the real one only when the boot
 * configuration allows it (`AiConfig.useRealProvider`: key, production, not a preview, not forced to
 * mock) and the user is not a demo user; everything else, including every test, gets the mock. The
 * real provider is built lazily and once, so nothing reaches for the SDK unless it is needed.
 */
@Injectable()
export class AiProviderRegistry {
  private readonly mock = new MockAiProvider();
  private real: AiProvider | null = null;
  private readonly mockEmbeddings = new MockEmbeddingProvider();
  private realEmbeddings: EmbeddingProvider | null = null;

  constructor(
    @Inject(AI_CONFIG) private readonly config: AiConfig,
    @Inject(REAL_AI_PROVIDER_FACTORY) private readonly createReal: RealAiProviderFactory,
  ) {}

  for(user: { isDemo: boolean }): AiProvider {
    if (!this.config.useRealProvider || user.isDemo) return this.mock;
    this.real ??= this.createReal(this.config);
    return this.real;
  }

  /**
   * The embedding provider for a user (ADR 0050 point 1): Voyage only when `useRealEmbeddings`
   * (key, production, not a preview, not forced to mock) and not a demo user; else the mock.
   */
  embeddingsFor(user: { isDemo: boolean }): EmbeddingProvider {
    if (!this.config.useRealEmbeddings || user.isDemo) return this.mockEmbeddings;
    this.realEmbeddings ??= createVoyageEmbeddingProvider(this.config);
    return this.realEmbeddings;
  }

  /**
   * The provider that holds a stored batch. A real batch is never answered by the mock: without the
   * real provider here (no key, not production) it is `null`, and the caller fails its jobs.
   */
  forBatch(provider: string): AiProvider | null {
    if (provider === this.mock.name) return this.mock;
    if (provider !== AI_PROVIDER_NAME.Anthropic || !this.config.useRealProvider) return null;
    return this.for({ isDemo: false });
  }
}
