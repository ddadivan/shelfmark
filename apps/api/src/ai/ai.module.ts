import { Module } from '@nestjs/common';
import { FetcherModule } from '../fetcher/fetcher.module';
import { FoldersModule } from '../folders/folders.module';
import { RulesModule } from '../rules/rules.module';
import { TagsModule } from '../tags/tags.module';
import { AiController } from './ai.controller';
import { AiTidyController } from './ai-tidy.controller';
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
import { AiEmbedService } from './embeddings/ai-embed.service';
import { AiSearchStatusService } from './embeddings/ai-search-status.service';
import { AiJobsService } from './jobs/ai-jobs.service';
import { MeaningSearchService } from './search/meaning-search.service';
import { RelatedLinksService } from './search/related-links.service';
import { RelatedLinksController } from './related-links.controller';
import { QueryEmbeddingCache } from './search/query-embedding-cache.service';
import { AiLinkHooksService } from './link-hooks/ai-link-hooks.service';
import { AI_CONFIG } from './models/ai-config.token';
import { REAL_AI_PROVIDER_FACTORY } from './models/real-ai-provider-factory.token';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { createAnthropicProvider } from './providers/anthropic-ai.provider';
import { AiRunnerService } from './runner/ai-runner.service';
import { AiSettingsService } from './settings/ai-settings.service';
import { AiTidyUndoService } from './tidy/ai-tidy-undo.service';
import { AiTidyService } from './tidy/ai-tidy.service';
import { AskRetrievalService } from './ask/ask-retrieval.service';
import { AskController } from './ask/ask.controller';
import { AskService } from './ask/ask.service';
import { AskUsageService } from './ask/ask-usage.service';
import { ASK_DEADLINES } from './models/ask-deadlines.token';
import type { AskDeadlines } from './models/ask-deadlines.interface';
import { ASK_LIMIT } from '@shelfmark/contracts';
import { AiUsageService } from './usage/ai-usage.service';

/**
 * AI (#389–#391, ADR 0047 / 0049). `LinksModule` imports this module (enqueue and draft attach in
 * the create transaction), so it must never import `LinksModule`. It imports `RulesModule` (no imports
 * of its own, so no cycle) for `RulesService.matcher`: a rule wins over AI in Tidy.
 */
@Module({
  imports: [FetcherModule, FoldersModule, RulesModule, TagsModule],
  controllers: [
    AiController,
    AiTidyController,
    LinkAiController,
    RelatedLinksController,
    AiSweepController,
    AskController,
  ],
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
    AiTidyService,
    AiTidyUndoService,
    AiSearchStatusService,
    AiEmbedService,
    QueryEmbeddingCache,
    MeaningSearchService,
    RelatedLinksService,
    AskRetrievalService,
    AskUsageService,
    AskService,
    {
      provide: ASK_DEADLINES,
      useValue: {
        firstTokenMs: ASK_LIMIT.FirstTokenMs,
        streamMaxMs: ASK_LIMIT.StreamMaxMs,
      } satisfies AskDeadlines,
    },
  ],
  exports: [
    AiProviderRegistry,
    AiSettingsService,
    AiUsageService,
    AiJobsService,
    AiSuggestionsService,
    AiLinkHooksService,
    AiEmbedService,
    AiSearchStatusService,
    AiBackgroundService,
  ],
})
export class AiModule {}
