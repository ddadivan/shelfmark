import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { readAiConfig } from './config/ai-config';
import { AI_CONFIG } from './models/ai-config.token';
import { REAL_AI_PROVIDER_FACTORY } from './models/real-ai-provider-factory.token';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { createAnthropicProvider } from './providers/anthropic-ai.provider';
import { AiSettingsService } from './settings/ai-settings.service';
import { AiUsageService } from './usage/ai-usage.service';

@Module({
  controllers: [AiController],
  providers: [
    // Read once at boot (the module is created when the app starts): never at import time.
    { provide: AI_CONFIG, useFactory: () => readAiConfig() },
    { provide: REAL_AI_PROVIDER_FACTORY, useValue: createAnthropicProvider },
    AiProviderRegistry,
    AiSettingsService,
    AiUsageService,
  ],
  exports: [AiProviderRegistry, AiSettingsService, AiUsageService],
})
export class AiModule {}
