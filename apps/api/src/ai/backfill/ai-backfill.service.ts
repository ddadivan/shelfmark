import { ConflictException, Injectable, Logger } from '@nestjs/common';
import {
  AI_BACKFILL_STATE,
  AI_ERROR_MESSAGE,
  AI_JOB_REASON,
  AI_QUOTA,
  AI_TIER,
  type AiBackfillStatus,
} from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { AiApplyService } from '../apply/ai-apply.service';
import { AiBackgroundService } from '../background/ai-background.service';
import { AiExcerptService } from '../excerpt/ai-excerpt.service';
import { AiJobsService } from '../jobs/ai-jobs.service';
import { requestedParts, toAiParts } from '../jobs/requested-parts';
import { AI_BACKFILL_LIMIT } from '../models/ai-backfill-limit.const';
import { AI_BATCH_STATE } from '../models/ai-batch-state.const';
import { AI_JOB_SOURCE } from '../models/ai-job-source.const';
import { AI_JOB_STATE } from '../models/ai-job-state.const';
import { LINK_BATCH_STATUS } from '../models/link-batch-status.const';
import type { AiDbClient } from '../models/ai-db-client.type';
import type { AiPart } from '../models/ai-part.type';
import type { BackfillChunkJob } from '../models/backfill-chunk-job.interface';
import type { CanceledBatch } from '../models/canceled-batch.interface';
import type { LinkBatchItem } from '../models/link-batch-item.interface';
import type { LinkBatchRequest } from '../models/link-batch-request.interface';
import type { LinkJobOutcome } from '../models/link-job-outcome.type';
import type { PageExcerpt } from '../models/page-excerpt.interface';
import { parseLinkOutput } from '../prompt/parse-link-output';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { loadLinkVocabulary } from '../runner/load-link-vocabulary';
import { AiSettingsService } from '../settings/ai-settings.service';
import { AiUsageService } from '../usage/ai-usage.service';
import { readFolderKeys, toFolderKeysJson } from './folder-keys';
import { mapLimit } from './map-limit';

const NO_EXCERPT: PageExcerpt = { excerpt: null, description: null };
/** Link AI states a backfill may (re)process: never ran, failed or was skipped. */
const REDO_STATES: string[] = [AI_JOB_STATE.Failed, AI_JOB_STATE.Skipped];

/**
 * "Process existing links" (ADR 0048 point 6, AI pack only): a keyset run over the user's live links
 * saved before AI was turned on that have no AI result, in chunks of up to 40, one provider batch per
 * chunk (`custom_id` = job id) recorded in `ai_batches`, counted against the one-time allowance
 * (`ai_settings.backfill_used`). Results go through `AiApplyService` like live jobs, but a backfill
 * never auto-applies. Advanced by the start, the tick and the sweep; pages are read outside any
 * transaction. Every statement filters by the user.
 */
@Injectable()
export class AiBackfillService {
  private readonly logger = new Logger(AiBackfillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly usage: AiUsageService,
    private readonly excerpts: AiExcerptService,
    private readonly registry: AiProviderRegistry,
    private readonly apply: AiApplyService,
    private readonly jobs: AiJobsService,
    private readonly background: AiBackgroundService,
  ) {}

  /** `GET /api/ai/backfill`. */
  async status(userId: string): Promise<AiBackfillStatus> {
    return (await this.settings.progress(userId)).backfill;
  }

  /**
   * `POST /api/ai/backfill`: 409 without the AI pack, while AI is off or while a run is in progress.
   * The run covers the eligible links up to what is left of the allowance (none left: `done`).
   */
  async start(userId: string): Promise<AiBackfillStatus> {
    const entitlements = await this.settings.entitlements(this.prisma, userId);
    if (entitlements.aiTier !== AI_TIER.AiPack) {
      throw new ConflictException(AI_ERROR_MESSAGE.BackfillNotIncluded);
    }
    const stored = await this.settings.read(this.prisma, userId);
    if (!stored.settings.enabled) throw new ConflictException(AI_ERROR_MESSAGE.AiOff);
    const eligible = await this.settings.eligibleForBackfill(userId, stored.enabledAt);
    const left = Math.max(0, AI_QUOTA[entitlements.aiTier].backfillLinks - stored.backfillUsed);
    const total = Math.min(eligible, left);
    const state = total > 0 ? AI_BACKFILL_STATE.Running : AI_BACKFILL_STATE.Done;
    // Conditional, so two starts at once cannot both begin a run.
    const started = await this.prisma.$executeRaw`
      UPDATE ai_settings
      SET backfill_state = ${state}, backfill_cursor = NULL, backfill_total = ${total},
        backfill_done = 0, backfill_started_at = now(), updated_at = now()
      WHERE user_id = ${userId}::uuid AND enabled AND backfill_state <> ${AI_BACKFILL_STATE.Running}`;
    if (started === 0) throw new ConflictException(AI_ERROR_MESSAGE.BackfillRunning);
    if (total > 0) {
      this.background.defer(() =>
        this.advance(userId, Date.now() + AI_BACKFILL_LIMIT.StartBudgetMs),
      );
    }
    return this.status(userId);
  }

  /**
   * `DELETE /api/ai/backfill`: stops a run and keeps what is done. Open batches are cancelled, their
   * unfinished jobs skipped and given back to the allowance. Idempotent.
   */
  async stop(userId: string): Promise<AiBackfillStatus> {
    const { canceled, skipped } = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE ai_settings SET backfill_state = ${AI_BACKFILL_STATE.Stopped},
          backfill_cursor = NULL, updated_at = now()
        WHERE user_id = ${userId}::uuid AND backfill_state = ${AI_BACKFILL_STATE.Running}`;
      const batches = await tx.$queryRaw<(CanceledBatch & { id: string })[]>`
        UPDATE ai_batches SET status = ${AI_BATCH_STATE.Canceled}, ended_at = now()
        WHERE user_id = ${userId}::uuid AND status = ${AI_BATCH_STATE.Submitted}
        RETURNING id, provider, provider_batch_id AS "providerBatchId"`;
      const ids = batches.map((batch) => batch.id);
      const rows = await tx.$queryRaw<{ n: number }[]>`
        WITH stopped AS (
          UPDATE ai_jobs
          SET status = ${AI_JOB_STATE.Skipped}, reason = ${AI_JOB_REASON.Off}, lease_until = NULL,
            result = NULL, updated_at = now()
          WHERE user_id = ${userId}::uuid AND status = ${AI_JOB_STATE.Running}
            AND batch_id = ANY(${ids}::uuid[])
          RETURNING link_id
        ), marked AS (
          UPDATE links SET ai_status = ${AI_JOB_STATE.Skipped}
          WHERE user_id = ${userId}::uuid AND id IN (SELECT link_id FROM stopped)
          RETURNING 1
        )
        SELECT count(*)::int AS n FROM stopped`;
      return { canceled: batches, skipped: rows[0]?.n ?? 0 };
    });
    // After the commit: the allowance row was locked by the transaction.
    await this.usage.refundBackfill(userId, skipped);
    await this.settings.cancelBatches(canceled);
    return this.status(userId);
  }

  /** Prepares and submits chunks while the run goes on and the budget lasts. */
  async advance(userId: string, deadline: number): Promise<void> {
    while (Date.now() < deadline) {
      const chunk = await this.claimChunk(userId);
      if (chunk === null) return;
      if (chunk.length === 0) continue;
      const submitted = await this.submit(userId, chunk, deadline);
      if (!submitted) return;
    }
  }

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

  /**
   * Claims the next chunk under the settings row lock: picks links after the cursor, takes them from
   * the allowance, creates their jobs (`running`, no lease, so no claim ever picks them) and moves the
   * cursor. `null` when the run is over (and marks it done), an empty array when the links of this
   * chunk asked for nothing.
   */
  private async claimChunk(userId: string): Promise<BackfillChunkJob[] | null> {
    const result = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ state: string; cursor: string | null }[]>`
        SELECT backfill_state AS state, backfill_cursor AS cursor FROM ai_settings
        WHERE user_id = ${userId}::uuid AND enabled
        FOR UPDATE`;
      const row = locked[0];
      if (row?.state !== AI_BACKFILL_STATE.Running) return null;
      const stored = await this.settings.read(tx, userId);
      const candidates = await tx.link.findMany({
        where: {
          userId,
          deletedAt: null,
          summary: null,
          createdAt: { lt: stored.enabledAt ?? new Date() },
          OR: [{ aiStatus: null }, { aiStatus: { in: REDO_STATES } }],
          ...(row.cursor === null ? {} : { id: { gt: row.cursor } }),
        },
        orderBy: { id: 'asc' },
        take: AI_BACKFILL_LIMIT.ChunkSize,
        select: {
          id: true,
          url: true,
          title: true,
          note: true,
          folderId: true,
          _count: { select: { tags: true } },
        },
      });
      if (candidates.length === 0) {
        const open = await tx.aiBatch.count({
          where: { userId, status: AI_BATCH_STATE.Submitted },
        });
        if (open === 0) await this.finishRun(tx, userId);
        return null;
      }
      const planned = candidates
        .map((link) => ({
          link,
          parts: requestedParts(stored.settings, {
            folderSet: link.folderId !== null,
            tagsSet: link._count.tags > 0,
          }),
        }))
        .filter((entry) => entry.parts.length > 0);
      const lastCandidate = candidates[candidates.length - 1]?.id ?? null;
      if (planned.length === 0) {
        await tx.$executeRaw`
          UPDATE ai_settings SET backfill_cursor = ${lastCandidate}::uuid,
            backfill_done = backfill_done + ${candidates.length}
          WHERE user_id = ${userId}::uuid`;
        return [];
      }
      const entitlements = await this.settings.entitlements(tx, userId);
      const granted = await this.usage.reserveBackfill(
        userId,
        entitlements.aiTier,
        planned.length,
        tx,
      );
      if (granted === 0) {
        await this.finishRun(tx, userId);
        return null;
      }
      const taken = planned.slice(0, granted);
      const cursor =
        granted < planned.length ? (taken[taken.length - 1]?.link.id ?? null) : lastCandidate;
      const language = await this.jobs.language(tx, userId, stored, {});
      const created = await tx.aiJob.createManyAndReturn({
        data: taken.map((entry) => ({
          userId,
          linkId: entry.link.id,
          source: AI_JOB_SOURCE.Backfill,
          status: AI_JOB_STATE.Running,
          attempts: 1,
          parts: entry.parts,
          language,
        })),
        select: { id: true, linkId: true },
      });
      const linkIds = taken.map((entry) => entry.link.id);
      await tx.$executeRaw`
        UPDATE links SET ai_status = ${AI_JOB_STATE.Pending}
        WHERE user_id = ${userId}::uuid AND id = ANY(${linkIds}::uuid[])`;
      await tx.$executeRaw`
        UPDATE ai_settings SET backfill_cursor = ${cursor}::uuid WHERE user_id = ${userId}::uuid`;
      const jobByLink = new Map(created.map((job) => [job.linkId, job.id]));
      return taken.map((entry): BackfillChunkJob => ({
        jobId: jobByLink.get(entry.link.id) ?? '',
        linkId: entry.link.id,
        parts: entry.parts,
        language,
        url: entry.link.url,
        title: entry.link.title,
        note: stored.settings.includeNotes ? entry.link.note : null,
      }));
    });
    return result;
  }

  /** Reads the pages, submits one batch and records it; a mock batch is applied at once. */
  private async submit(
    userId: string,
    chunk: readonly BackfillChunkJob[],
    deadline: number,
  ): Promise<boolean> {
    const account = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isDemo: true, fetchPreviews: true },
    });
    const jobIds = chunk.map((job) => job.jobId);
    if (!account) return false;
    const vocabulary = await loadLinkVocabulary(this.prisma, userId);
    const pages = await mapLimit(chunk, AI_BACKFILL_LIMIT.ExcerptConcurrency, (job) =>
      account.fetchPreviews && deadline - Date.now() > AI_BACKFILL_LIMIT.ExcerptMarginMs
        ? this.excerpts.load(job.url)
        : Promise.resolve(NO_EXCERPT),
    );
    const requests: LinkBatchRequest[] = chunk.map((job, index) => ({
      customId: job.jobId,
      input: {
        parts: job.parts,
        language: job.language,
        url: job.url,
        title: job.title,
        description: pages[index]?.description ?? null,
        note: job.note,
        excerpt: pages[index]?.excerpt ?? null,
        tags: vocabulary.tags,
        folders: vocabulary.folders,
      },
    }));
    const provider = this.registry.for(account);
    let submission;
    try {
      submission = await provider.submitLinkBatch(requests);
    } catch (error) {
      this.logger.warn(
        `AI backfill batch of ${chunk.length} failed to submit (${error instanceof Error ? error.name : 'unknown'})`,
      );
      const failed = await this.failJobs(userId, jobIds);
      await this.usage.refundBackfill(userId, failed);
      await this.countDone(userId, failed);
      return false;
    }
    const completed = submission.completed !== null;
    const batch = await this.prisma.aiBatch.create({
      data: {
        userId,
        provider: provider.name,
        providerBatchId: submission.providerBatchId,
        requestCount: chunk.length,
        status: completed ? AI_BATCH_STATE.Ended : AI_BATCH_STATE.Submitted,
        endedAt: completed ? new Date() : null,
      },
      select: { id: true },
    });
    await this.prisma.aiJob.updateMany({
      where: { userId, id: { in: jobIds }, status: AI_JOB_STATE.Running },
      data: { batchId: batch.id, result: toFolderKeysJson(vocabulary.folderIdByKey) },
    });
    if (submission.completed !== null) {
      await this.applyItems(userId, batch.id, submission.completed);
    }
    return true;
  }

  /** Every item of an ended batch through the apply path; jobs without an item fail. */
  private async applyItems(
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
            folders: [...folderKeys.keys()].map((key) => ({ key, path: '' })),
          })
        : null;
    if (!parsed) {
      await this.apply.settle(jobId, userId, AI_JOB_STATE.Failed, AI_JOB_REASON.Rejected);
      return false;
    }
    await this.apply.finish(jobId, userId, {
      tags: parsed.tags,
      newTag: parsed.newTag,
      folderId: parsed.folder === null ? null : (folderKeys.get(parsed.folder) ?? null),
      summary: parsed.summary,
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
  private async failJobs(userId: string, jobIds: readonly string[]): Promise<number> {
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

  private async countDone(userId: string, count: number): Promise<void> {
    if (count <= 0) return;
    await this.prisma.$executeRaw`
      UPDATE ai_settings SET backfill_done = backfill_done + ${count}
      WHERE user_id = ${userId}::uuid`;
  }

  private async finishRun(tx: AiDbClient, userId: string): Promise<void> {
    await tx.$executeRaw`
      UPDATE ai_settings SET backfill_state = ${AI_BACKFILL_STATE.Done}, backfill_cursor = NULL,
        updated_at = now()
      WHERE user_id = ${userId}::uuid AND backfill_state = ${AI_BACKFILL_STATE.Running}`;
  }
}
