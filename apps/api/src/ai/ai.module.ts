import { Module } from '@nestjs/common';
import { readAiConfig } from './config/ai-config';
import { AI_CONFIG } from './models/ai-config.token';
import { REAL_AI_PROVIDER_FACTORY } from './models/real-ai-provider-factory.token';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { MockAiProvider } from './providers/mock-ai.provider';

@Module({
  providers: [
    // Read once at boot (the module is created when the app starts): never at import time.
    { provide: AI_CONFIG, useFactory: () => readAiConfig() },
    { provide: REAL_AI_PROVIDER_FACTORY, useValue: () => new MockAiProvider() },
    AiProviderRegistry,
  ],
  exports: [AiProviderRegistry],
})
export class AiModule {}
