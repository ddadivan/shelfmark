import { Injectable } from '@nestjs/common';
import { AI_BACKFILL_STATE, SUMMARY_SOURCE } from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_BATCH_STATE } from '../models/ai-batch-state.const';
import type { CanceledBatch } from '../models/canceled-batch.interface';
import { AiSettingsService } from '../settings/ai-settings.service';

/**
 * `DELETE /api/ai/data` (#389, Privacy): removes what AI generated for the user — summaries written
 * by AI, every suggestion, every job (with any stored result), every search-by-meaning vector (and
 * turns that switch off) — cancels open batches and stops a running backfill. The user's own summaries, tags, folders, settings and the usage counts stay. A
 * job that is running meanwhile finds its row gone and its result is discarded. Plain SQL on links,
 * so `updated_at` stays.
 */
@Injectable()
export class AiDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
  ) {}

  async deleteAll(userId: string): Promise<void> {
    const canceled = await this.prisma.$transaction(async (tx) => {
      const batches = await tx.$queryRaw<CanceledBatch[]>`
        UPDATE ai_batches SET status = ${AI_BATCH_STATE.Canceled}, ended_at = now()
        WHERE user_id = ${userId}::uuid AND status = ${AI_BATCH_STATE.Submitted}
        RETURNING provider, provider_batch_id AS "providerBatchId"`;
      await tx.linkSuggestion.deleteMany({ where: { userId } });
      await tx.aiJob.deleteMany({ where: { userId } });
      await tx.$executeRaw`
        UPDATE links SET summary = NULL, summary_source = NULL
        WHERE user_id = ${userId}::uuid AND summary_source = ${SUMMARY_SOURCE.Ai}`;
      await tx.$executeRaw`
        UPDATE links SET ai_status = NULL
        WHERE user_id = ${userId}::uuid AND ai_status IS NOT NULL`;
      await tx.$executeRaw`
        UPDATE ai_settings SET backfill_state = ${AI_BACKFILL_STATE.Stopped}, backfill_cursor = NULL
        WHERE user_id = ${userId}::uuid AND backfill_state = ${AI_BACKFILL_STATE.Running}`;
      // Search by meaning (ADR 0050): the switch turns off so the vectors are not rebuilt at once
      // (open question 3), then every vector goes. The order matters: the settings row lock comes
      // first, so a pass writing during the provider call either waits and finds the switch off or
      // has committed before the delete reads the table (`AiEmbedService.searchStillOn`).
      await tx.$executeRaw`
        UPDATE ai_settings SET meaning_search = false, embed_lease_until = NULL,
          embed_not_before = NULL, embed_failures = 0, embed_failed_at = NULL
        WHERE user_id = ${userId}::uuid`;
      await tx.$executeRaw`DELETE FROM link_embeddings WHERE user_id = ${userId}::uuid`;
      return batches;
    });
    await this.settings.cancelBatches(canceled);
  }
}
