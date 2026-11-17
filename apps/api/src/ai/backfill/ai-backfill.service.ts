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
import { AiBackgroundService } from '../background/ai-background.service';
import { AiExcerptService } from '../excerpt/ai-excerpt.service';
import { AiJobsService } from '../jobs/ai-jobs.service';
import { requestedParts } from '../jobs/requested-parts';
import { AI_BACKFILL_LIMIT } from '../models/ai-backfill-limit.const';
import { AI_BATCH_STATE } from '../models/ai-batch-state.const';
import { AI_JOB_SOURCE } from '../models/ai-job-source.const';
import { AI_JOB_STATE } from '../models/ai-job-state.const';
import type { AiDbClient } from '../models/ai-db-client.type';
import type { BackfillChunkJob } from '../models/backfill-chunk-job.interface';
import type { BatchRecord } from '../models/batch-record.interface';
import type { CanceledBatch } from '../models/canceled-batch.interface';
import type { LinkBatchRequest } from '../models/link-batch-request.interface';
import type { PageExcerpt } from '../models/page-excerpt.interface';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { loadLinkVocabulary } from '../runner/load-link-vocabulary';
import { loadSiteExamples } from '../runner/load-site-examples';
import { AiSettingsService } from '../settings/ai-settings.service';
import { AiUsageService } from '../usage/ai-usage.service';
import { AiBackfillResultsService } from './ai-backfill-results.service';
import { toFolderKeysJson } from './folder-keys';
import { mapLimit } from './map-limit';

const NO_EXCERPT: PageExcerpt = { excerpt: null, description: null };
/** Link AI states a backfill may (re)process: never ran, failed or was skipped. */
const REDO_STATES: string[] = [AI_JOB_STATE.Failed, AI_JOB_STATE.Skipped];

/**
 * "Process existing links" (ADR 0048 point 6, AI pack only): a keyset run over the user's live links
 * saved before AI was turned on that have no AI result, in chunks of up to 40, one provider batch per
 * chunk (`custom_id` = job id) recorded in `ai_batches`, counted against the one-time allowance
 * (`ai_settings.backfill_used`). This service starts, stops, claims and submits; results are polled
 * and applied by `AiBackfillResultsService`. Advanced by the start, the tick and the sweep; pages are
 * read outside any transaction. Every statement filters by the user.
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
    private readonly results: AiBackfillResultsService,
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
   * `DELETE /api/ai/backfill`: stops a run and keeps what is done. Open batches are cancelled, every
   * unfinished backfill job (in a batch or in a chunk still being submitted) is skipped and given back
   * to the allowance. Idempotent.
   */
  async stop(userId: string): Promise<AiBackfillStatus> {
    const { canceled, skipped } = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE ai_settings SET backfill_state = ${AI_BACKFILL_STATE.Stopped},
          backfill_cursor = NULL, updated_at = now()
        WHERE user_id = ${userId}::uuid AND backfill_state = ${AI_BACKFILL_STATE.Running}`;
      const batches = await tx.$queryRaw<CanceledBatch[]>`
        UPDATE ai_batches SET status = ${AI_BATCH_STATE.Canceled}, ended_at = now()
        WHERE user_id = ${userId}::uuid AND status = ${AI_BATCH_STATE.Submitted}
        RETURNING provider, provider_batch_id AS "providerBatchId"`;
      // A chunk being submitted right now has no batch yet: its jobs stop too, and `submit` sees it
      // under the same settings row lock and records no batch.
      const rows = await tx.$queryRaw<{ n: number }[]>`
        WITH stopped AS (
          UPDATE ai_jobs
          SET status = ${AI_JOB_STATE.Skipped}, reason = ${AI_JOB_REASON.Off}, lease_until = NULL,
            result = NULL, updated_at = now()
          WHERE user_id = ${userId}::uuid AND status = ${AI_JOB_STATE.Running}
            AND source = ${AI_JOB_SOURCE.Backfill}
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
   * Claims the next chunk under the settings row lock: picks links after the cursor, takes them from
   * the allowance, creates their jobs (`running` with a chunk lease; the runner never claims backfill
   * jobs, and a chunk whose instance died before its batch was recorded fails once the lease is over,
   * see `AiBackfillResultsService.failOrphans`) and moves the cursor. `null` when the run is over (and marks it done), an empty array when the links of this
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
      const leaseUntil = new Date(Date.now() + AI_BACKFILL_LIMIT.ChunkLeaseMs);
      const created = await tx.aiJob.createManyAndReturn({
        data: taken.map((entry) => ({
          userId,
          linkId: entry.link.id,
          source: AI_JOB_SOURCE.Backfill,
          status: AI_JOB_STATE.Running,
          attempts: 1,
          leaseUntil,
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
    // One query for the whole chunk.
    const examples = await loadSiteExamples(
      this.prisma,
      userId,
      chunk.map((job) => ({ url: job.url, linkId: job.linkId })),
      vocabulary.folderIdByKey,
      vocabulary.tags,
    );
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
        examples: examples[index] ?? [],
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
      const failed = await this.results.failJobs(userId, jobIds);
      await this.usage.refundBackfill(userId, failed);
      await this.results.countDone(userId, failed);
      return false;
    }
    const completed = submission.completed !== null;
    const batchId = await this.record(userId, jobIds, {
      provider: provider.name,
      providerBatchId: submission.providerBatchId,
      completed,
      folderKeys: toFolderKeysJson(vocabulary.folderIdByKey),
    });
    if (batchId === null) {
      // Stopped (or AI turned off) while the chunk was being submitted: its jobs are already
      // skipped and refunded; the batch is never recorded, so nothing of it is ever applied.
      if (!completed) {
        await this.settings.cancelBatches([
          { provider: provider.name, providerBatchId: submission.providerBatchId },
        ]);
      }
      return false;
    }
    if (submission.completed !== null) {
      await this.results.applyItems(userId, batchId, submission.completed);
    }
    return true;
  }

  /**
   * Records a submitted batch and moves the chunk's jobs into it, under the settings row lock that
   * `stop` and turning AI off take first: `null` (nothing recorded) when they stopped the chunk.
   */
  private async record(
    userId: string,
    jobIds: readonly string[],
    batch: BatchRecord,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM ai_settings WHERE user_id = ${userId}::uuid FOR UPDATE`;
      const running = await tx.aiJob.count({
        where: { userId, id: { in: [...jobIds] }, status: AI_JOB_STATE.Running },
      });
      if (running === 0) return null;
      const row = await tx.aiBatch.create({
        data: {
          userId,
          provider: batch.provider,
          providerBatchId: batch.providerBatchId,
          requestCount: jobIds.length,
          status: batch.completed ? AI_BATCH_STATE.Ended : AI_BATCH_STATE.Submitted,
          endedAt: batch.completed ? new Date() : null,
        },
        select: { id: true },
      });
      await tx.aiJob.updateMany({
        where: { userId, id: { in: [...jobIds] }, status: AI_JOB_STATE.Running },
        data: { batchId: row.id, leaseUntil: null, result: batch.folderKeys },
      });
      return row.id;
    });
  }

  private async finishRun(tx: AiDbClient, userId: string): Promise<void> {
    await tx.$executeRaw`
      UPDATE ai_settings SET backfill_state = ${AI_BACKFILL_STATE.Done}, backfill_cursor = NULL,
        updated_at = now()
      WHERE user_id = ${userId}::uuid AND backfill_state = ${AI_BACKFILL_STATE.Running}`;
  }
}
