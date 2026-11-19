import { Injectable, Logger } from '@nestjs/common';
import { AI_JOB_REASON } from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { AiApplyService } from '../apply/ai-apply.service';
import { toAiParts } from '../jobs/requested-parts';
import { AI_BATCH_STATE } from '../models/ai-batch-state.const';
import { AI_JOB_SOURCE } from '../models/ai-job-source.const';
import { AI_JOB_STATE } from '../models/ai-job-state.const';
import { LINK_BATCH_STATUS } from '../models/link-batch-status.const';
import type { AiPart } from '../models/ai-part.type';
import type { LinkBatchItem } from '../models/link-batch-item.interface';
import type { LinkJobOutcome } from '../models/link-job-outcome.type';
import { parseLinkOutput } from '../prompt/parse-link-output';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { loadLinkVocabulary } from '../runner/load-link-vocabulary';
import { AiUsageService } from '../usage/ai-usage.service';
import { readFolderKeys } from './folder-keys';

/**
 * The result side of "Process existing links" (ADR 0049 point 6): polls the user's open provider
 * batches and sends every item of an ended one through `AiApplyService` (a backfill never
 * auto-applies), fails jobs that can no longer get an answer and gives their links back to the
 * one-time allowance. The claim and submit side is `AiBackfillService`. Every statement filters by
 * the user.
 */
@Injectable()
export class AiBackfillResultsService {
  private readonly logger = new Logger(AiBackfillResultsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: AiUsageService,
    private readonly registry: AiProviderRegistry,
    private readonly apply: AiApplyService,
  ) {}

  /**
   * Polls the user's open batches; an ended one is read and every item goes through the apply path.
   * A batch whose provider is not available here (a real batch without the real provider) is ended
   * and its jobs fail as `unavailable`, never silently answered by the mock.
   */
  async poll(userId: string, deadline: number): Promise<void> {
    const batches = await this.prisma.aiBatch.findMany({
      where: { userId, status: AI_BATCH_STATE.Submitted },
      orderBy: { createdAt: 'asc' },
      select: { id: true, provider: true, providerBatchId: true },
    });
    for (const batch of batches) {
      if (Date.now() >= deadline) return;
      const provider = this.registry.forBatch(batch.provider);
      if (provider === null) {
        if (await this.endBatch(userId, batch.id)) await this.failBatchJobs(userId, batch.id);
        continue;
      }
      let items: LinkBatchItem[];
      try {
        if (
          (await provider.getLinkBatchStatus(batch.providerBatchId)) !== LINK_BATCH_STATUS.Ended
        ) {
          continue;
        }
        items = await provider.readLinkBatchResults(batch.providerBatchId);
      } catch (error) {
        this.logger.warn(
          `AI batch ${batch.id} poll failed (${error instanceof Error ? error.name : 'unknown'})`,
        );
        continue;
      }
      // Only the poll that ends the batch applies it.
      if (await this.endBatch(userId, batch.id)) await this.applyItems(userId, batch.id, items);
    }
  }

  /** Every item of an ended batch through the apply path; jobs without an item fail. */
  async applyItems(
    userId: string,
    batchId: string,
    items: readonly LinkBatchItem[],
  ): Promise<void> {
    const jobs = await this.prisma.aiJob.findMany({
      where: { userId, batchId, status: AI_JOB_STATE.Running },
      select: { id: true, parts: true, result: true },
    });
    if (jobs.length === 0) return;
    const byId = new Map(jobs.map((job) => [job.id, job]));
    const { tags } = await loadLinkVocabulary(this.prisma, userId);
    let refunds = 0;
    const seen = new Set<string>();
    for (const item of items) {
      const job = byId.get(item.customId);
      if (!job || seen.has(job.id)) continue;
      seen.add(job.id);
      const refund = await this.applyOne(
        userId,
        job.id,
        toAiParts(job.parts),
        readFolderKeys(job.result),
        tags,
        item.outcome,
      );
      if (refund) refunds += 1;
    }
    const missing = jobs.filter((job) => !seen.has(job.id)).map((job) => job.id);
    refunds += await this.failJobs(userId, missing);
    await this.usage.refundBackfill(userId, refunds);
    await this.countDone(userId, jobs.length);
  }

  /** Applies one outcome; answers whether its allowance link is given back (no answer at all). */
  private async applyOne(
    userId: string,
    jobId: string,
    parts: AiPart[],
    folderKeys: ReadonlyMap<string, string>,
    tags: readonly string[],
    outcome: LinkJobOutcome,
  ): Promise<boolean> {
    if (outcome.type === 'error') {
      await this.apply.settle(jobId, userId, AI_JOB_STATE.Failed, AI_JOB_REASON.Unavailable);
      return true;
    }
    const parsed =
      outcome.type === 'output'
        ? parseLinkOutput(outcome.output, {
            parts,
            tags,
            title: { wanted: false, page: null },
            folders: [...folderKeys.keys()].map((key) => ({ key, path: '' })),
          })
        : null;
    if (!parsed) {
      await this.apply.settle(jobId, userId, AI_JOB_STATE.Failed, AI_JOB_REASON.Rejected);
      return false;
    }
    await this.apply.finish(jobId, userId, {
      tags: parsed.tags,
      newTags: parsed.newTags,
      moreTags: parsed.moreTags,
      folderId: parsed.folder === null ? null : (folderKeys.get(parsed.folder) ?? null),
      summary: parsed.summary,
      title: null,
    });
    return false;
  }

  /** Ends a submitted batch; `false` when another poll (or a stop) already closed it. */
  private async endBatch(userId: string, batchId: string): Promise<boolean> {
    const ended = await this.prisma.aiBatch.updateMany({
      where: { id: batchId, userId, status: AI_BATCH_STATE.Submitted },
      data: { status: AI_BATCH_STATE.Ended, endedAt: new Date() },
    });
    return ended.count > 0;
  }

  private async failBatchJobs(userId: string, batchId: string): Promise<void> {
    this.logger.warn(`AI batch ${batchId} has no provider here: its jobs fail (unavailable)`);
    const jobs = await this.prisma.aiJob.findMany({
      where: { userId, batchId, status: AI_JOB_STATE.Running },
      select: { id: true },
    });
    const failed = await this.failJobs(
      userId,
      jobs.map((job) => job.id),
    );
    await this.usage.refundBackfill(userId, failed);
    await this.countDone(userId, failed);
  }

  /** Fails running jobs of the user as `unavailable` (and their links); answers how many. */
  async failJobs(userId: string, jobIds: readonly string[]): Promise<number> {
    if (jobIds.length === 0) return 0;
    const rows = await this.prisma.$queryRaw<{ n: number }[]>`
      WITH failed AS (
        UPDATE ai_jobs
        SET status = ${AI_JOB_STATE.Failed}, reason = ${AI_JOB_REASON.Unavailable},
          lease_until = NULL, result = NULL, updated_at = now()
        WHERE user_id = ${userId}::uuid AND id = ANY(${jobIds}::uuid[])
          AND status = ${AI_JOB_STATE.Running}
        RETURNING link_id
      ), marked AS (
        UPDATE links SET ai_status = ${AI_JOB_STATE.Failed}
        WHERE user_id = ${userId}::uuid AND id IN (SELECT link_id FROM failed)
        RETURNING 1
      )
      SELECT count(*)::int AS n FROM failed`;
    return rows[0]?.n ?? 0;
  }

  /**
   * Fails backfill jobs whose chunk was claimed but never recorded as a batch (the instance died in
   * between) once the chunk lease is over, marks their links and gives them back to the allowance;
   * they count as done. `null` covers every user (the sweep only). Answers how many failed.
   */
  async failOrphans(userId: string | null): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ userId: string; n: number }[]>`
      WITH failed AS (
        UPDATE ai_jobs
        SET status = ${AI_JOB_STATE.Failed}, reason = ${AI_JOB_REASON.Unavailable},
          lease_until = NULL, result = NULL, updated_at = now()
        WHERE source = ${AI_JOB_SOURCE.Backfill} AND status = ${AI_JOB_STATE.Running}
          AND batch_id IS NULL AND lease_until < now()
          AND (${userId}::uuid IS NULL OR user_id = ${userId}::uuid)
        RETURNING user_id, link_id
      ), marked AS (
        UPDATE links AS l SET ai_status = ${AI_JOB_STATE.Failed}
        FROM failed AS f
        WHERE l.id = f.link_id AND l.user_id = f.user_id
        RETURNING 1
      )
      SELECT user_id AS "userId", count(*)::int AS n FROM failed GROUP BY user_id`;
    let total = 0;
    for (const row of rows) {
      await this.usage.refundBackfill(row.userId, row.n);
      await this.countDone(row.userId, row.n);
      total += row.n;
    }
    if (total > 0) this.logger.warn(`AI backfill: ${total} orphaned job(s) failed (unavailable)`);
    return total;
  }

  async countDone(userId: string, count: number): Promise<void> {
    if (count <= 0) return;
    await this.prisma.$executeRaw`
      UPDATE ai_settings SET backfill_done = backfill_done + ${count}
      WHERE user_id = ${userId}::uuid`;
  }
}
