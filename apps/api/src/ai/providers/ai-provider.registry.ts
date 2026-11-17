import { Inject, Injectable } from '@nestjs/common';
import { AI_CONFIG } from '../models/ai-config.token';
import { REAL_AI_PROVIDER_FACTORY } from '../models/real-ai-provider-factory.token';
import { MockAiProvider } from './mock-ai.provider';
import type { AiConfig } from '../models/ai-config.interface';
import type { AiProvider } from '../models/ai-provider.interface';
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

  constructor(
    @Inject(AI_CONFIG) private readonly config: AiConfig,
    @Inject(REAL_AI_PROVIDER_FACTORY) private readonly createReal: RealAiProviderFactory,
  ) {}

  for(user: { isDemo: boolean }): AiProvider {
    if (!this.config.useRealProvider || user.isDemo) return this.mock;
    this.real ??= this.createReal(this.config);
    return this.real;
  }

  /** The provider that holds a stored batch (backfill users are never demo users). */
  forBatch(provider: string): AiProvider {
    return provider === this.mock.name ? this.mock : this.for({ isDemo: false });
  }
}
