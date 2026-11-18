import { Module } from '@nestjs/common';
import { FetcherModule } from '../fetcher/fetcher.module';
import { FoldersModule } from '../folders/folders.module';
import { TagsModule } from '../tags/tags.module';
import { AiController } from './ai.controller';
import { LinkAiController } from './link-ai.controller';
import { AiSweepController } from './ai-sweep.controller';
import { AiBackfillResultsService } from './backfill/ai-backfill-results.service';
import { AiBackfillService } from './backfill/ai-backfill.service';
import { AiCatchUpService } from './catch-up/ai-catch-up.service';
import { LinkAiService } from './link-ai/link-ai.service';
import { AiDataService } from './data/ai-data.service';
import { AiSuggestionsService } from './suggestions/ai-suggestions.service';
import { AiApplyService } from './apply/ai-apply.service';
import { AiBackgroundService } from './background/ai-background.service';
import { readAiConfig } from './config/ai-config';
import { AiExcerptService } from './excerpt/ai-excerpt.service';
import { AiJobsService } from './jobs/ai-jobs.service';
import { AiLinkHooksService } from './link-hooks/ai-link-hooks.service';
import { AI_CONFIG } from './models/ai-config.token';
import { REAL_AI_PROVIDER_FACTORY } from './models/real-ai-provider-factory.token';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { createAnthropicProvider } from './providers/anthropic-ai.provider';
import { AiRunnerService } from './runner/ai-runner.service';
import { AiSettingsService } from './settings/ai-settings.service';
import { AiUsageService } from './usage/ai-usage.service';

/**
 * AI (#389–#391, ADR 0047 / 0049). `LinksModule` imports this module (enqueue and draft attach in
 * the create transaction), so it must never import `LinksModule`.
 */
@Module({
  imports: [FetcherModule, FoldersModule, TagsModule],
  controllers: [AiController, LinkAiController, AiSweepController],
  providers: [
    // Read once at boot (the module is created when the app starts): never at import time.
    { provide: AI_CONFIG, useFactory: () => readAiConfig() },
    { provide: REAL_AI_PROVIDER_FACTORY, useValue: createAnthropicProvider },
    AiProviderRegistry,
    AiSettingsService,
    AiUsageService,
    AiExcerptService,
    AiBackgroundService,
    AiApplyService,
    AiRunnerService,
    AiJobsService,
    AiSuggestionsService,
    AiLinkHooksService,
    LinkAiService,
    AiDataService,
    AiBackfillResultsService,
    AiBackfillService,
    AiCatchUpService,
  ],
  exports: [
    AiProviderRegistry,
    AiSettingsService,
    AiUsageService,
    AiJobsService,
    AiSuggestionsService,
    AiLinkHooksService,
  ],
})
export class AiModule {}
