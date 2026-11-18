import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AI_BACKFILL_STATE,
  AI_ERROR_MESSAGE,
  AI_JOB_REASON,
  AI_PROVIDER_STATUS,
  type AiEntitlements,
  type AiProviderStatus,
  type AiSettingsResponse,
  type AiTickResponse,
  type UpdateAiSettingsRequest,
} from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { readAiFullAccessEmails } from '../config/ai-full-access-config';
import { AI_BATCH_STATE } from '../models/ai-batch-state.const';
import { AI_JOB_SOURCE } from '../models/ai-job-source.const';
import { AI_JOB_STATE } from '../models/ai-job-state.const';
import { AI_STATUS_LIMIT } from '../models/ai-status-limit.const';
import type { AiDbClient } from '../models/ai-db-client.type';
import type { CanceledBatch } from '../models/canceled-batch.interface';
import type { StoppedQueue } from '../models/stopped-queue.interface';
import type { StoredAiSettings } from '../models/stored-ai-settings.interface';
import { AiEmbedService } from '../embeddings/ai-embed.service';
import { AiSearchStatusService } from '../embeddings/ai-search-status.service';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { AiUsageService } from '../usage/ai-usage.service';
import { aiEntitlements } from './ai-entitlements';
import { toBackfillStatus } from './to-backfill-status';
import { toStoredAiSettings } from './to-ai-settings';

const SETTINGS_SELECT = {
  enabled: true,
  folderMode: true,
  tagsMode: true,
  summaries: true,
  includeNotes: true,
  summaryLanguage: true,
  meaningSearch: true,
  enabledAt: true,
  introSeenAt: true,
  backfillState: true,
  backfillTotal: true,
  backfillDone: true,
  backfillUsed: true,
  embedFailedAt: true,
} as const;

/**
 * Settings › AI (#389). A user without an `ai_settings` row has the defaults with AI off; the row is
 * written by the first `PATCH`. Turning AI off stops what is queued: pending and running jobs are
 * skipped (`off`; a running job's result is discarded when it finishes, see `AiApplyService`), a
 * running backfill stops and open batches are cancelled. What was generated stays.
 */
@Injectable()
export class AiSettingsService {
  private readonly logger = new Logger(AiSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: AiUsageService,
    private readonly registry: AiProviderRegistry,
    private readonly searchStatus: AiSearchStatusService,
    private readonly embed: AiEmbedService,
  ) {}

  /** The stored settings of the user (defaults when there is no row). */
  async read(db: AiDbClient, userId: string): Promise<StoredAiSettings> {
    const row = await db.aiSettings.findUnique({ where: { userId }, select: SETTINGS_SELECT });
    return toStoredAiSettings(row);
  }

  /** Entitlements from the account and `AI_FULL_ACCESS_EMAILS` (read now, never stored). */
  async entitlements(db: AiDbClient, userId: string): Promise<AiEntitlements> {
    const account = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true, isDemo: true, plan: true, aiPack: true },
    });
    if (!account) throw new NotFoundException();
    return aiEntitlements(account, readAiFullAccessEmails());
  }

  async get(userId: string): Promise<AiSettingsResponse> {
    const entitlements = await this.entitlements(this.prisma, userId);
    const stored = await this.read(this.prisma, userId);
    const [usage, providerStatus, pendingJobs, eligible, search] = await Promise.all([
      this.usage.read(userId, entitlements.aiTier, stored.backfillUsed),
      this.providerStatus(userId),
      this.pendingJobs(userId),
      this.eligibleForBackfill(userId, stored.enabledAt),
      this.searchStatus.status(userId, stored, entitlements.aiTier),
    ]);
    return {
      settings: stored.settings,
      introSeen: stored.introSeenAt !== null,
      entitlements,
      usage,
      providerStatus,
      pendingJobs,
      backfill: toBackfillStatus(stored, eligible),
      search,
    };
  }

  async update(userId: string, request: UpdateAiSettingsRequest): Promise<AiSettingsResponse> {
    if (Object.values(request).every((value) => value === undefined)) {
      throw new BadRequestException(AI_ERROR_MESSAGE.NothingToUpdate);
    }
    let startEmbedding = false;
    const stopped = await this.prisma.$transaction(async (tx) => {
      const current = await this.read(tx, userId);
      const before = current.settings;
      const after = {
        enabled: request.enabled ?? before.enabled,
        meaningSearch: request.meaningSearch ?? before.meaningSearch,
        includeNotes: request.includeNotes ?? before.includeNotes,
      };
      const searchOn = after.enabled && after.meaningSearch;
      // Turning search by meaning on (or AI with it), or changing what is sent, starts the embed pass
      // after the commit; turning it off releases the lease and keeps the vectors (nothing is sent).
      startEmbedding =
        searchOn &&
        (!(before.enabled && before.meaningSearch) || after.includeNotes !== before.includeNotes);
      const now = new Date();
      const changes = {
        ...(request.enabled === undefined ? {} : { enabled: request.enabled }),
        ...(request.folderMode === undefined ? {} : { folderMode: request.folderMode }),
        ...(request.tagsMode === undefined ? {} : { tagsMode: request.tagsMode }),
        ...(request.summaries === undefined ? {} : { summaries: request.summaries }),
        ...(request.includeNotes === undefined ? {} : { includeNotes: request.includeNotes }),
        ...(request.summaryLanguage === undefined
          ? {}
          : { summaryLanguage: request.summaryLanguage }),
        ...(request.meaningSearch === undefined ? {} : { meaningSearch: request.meaningSearch }),
        ...(searchOn ? {} : { embedLeaseUntil: null }),
        // The intro's "Turn on AI" is the first `enabled: true`: it records both moments.
        ...(request.enabled === true && current.enabledAt === null ? { enabledAt: now } : {}),
        ...(request.enabled === true && current.introSeenAt === null ? { introSeenAt: now } : {}),
        ...(request.enabled === false && current.backfillState === AI_BACKFILL_STATE.Running
          ? { backfillState: AI_BACKFILL_STATE.Stopped }
          : {}),
      };
      await tx.aiSettings.upsert({
        where: { userId },
        create: { userId, ...changes },
        update: changes,
      });
      return request.enabled === false ? this.stopQueued(tx, userId) : null;
    });
    if (stopped) {
      // After the commit: the allowance row was locked by the transaction.
      await this.usage.refundBackfill(userId, stopped.backfillSkipped);
      await this.cancelBatches(stopped.canceled);
    }
    if (startEmbedding) await this.embed.kick(userId);
    return this.get(userId);
  }

  /**
   * Skips the user's queued jobs (backfill chunks still being submitted included) and closes their
   * open batches; answers the batches to cancel and how many backfill jobs to give back.
   */
  private async stopQueued(tx: AiDbClient, userId: string): Promise<StoppedQueue> {
    const rows = await tx.$queryRaw<{ n: number }[]>`
      WITH stopped AS (
        UPDATE ai_jobs
        SET status = ${AI_JOB_STATE.Skipped}, reason = ${AI_JOB_REASON.Off}, lease_until = NULL,
          not_before = NULL, result = NULL, updated_at = now()
        WHERE user_id = ${userId}::uuid
          AND status IN (${AI_JOB_STATE.Pending}, ${AI_JOB_STATE.Running})
        RETURNING link_id, source
      ), marked AS (
        UPDATE links SET ai_status = ${AI_JOB_STATE.Skipped}
        WHERE user_id = ${userId}::uuid
          AND id IN (SELECT link_id FROM stopped WHERE link_id IS NOT NULL)
        RETURNING 1
      )
      SELECT (count(*) FILTER (WHERE source = ${AI_JOB_SOURCE.Backfill}))::int AS n FROM stopped`;
    const canceled = await tx.$queryRaw<CanceledBatch[]>`
      UPDATE ai_batches SET status = ${AI_BATCH_STATE.Canceled}, ended_at = now()
      WHERE user_id = ${userId}::uuid AND status = ${AI_BATCH_STATE.Submitted}
      RETURNING provider, provider_batch_id AS "providerBatchId"`;
    return { canceled, backfillSkipped: rows[0]?.n ?? 0 };
  }

  /** Best effort after the commit: a batch the provider cannot cancel just ends unread. */
  async cancelBatches(batches: readonly CanceledBatch[]): Promise<void> {
    let failed = 0;
    for (const batch of batches) {
      try {
        // A batch whose provider is not available here cannot be cancelled: it ends unread.
        await this.registry.forBatch(batch.provider)?.cancelLinkBatch(batch.providerBatchId);
      } catch {
        failed += 1;
      }
    }
    if (failed > 0) this.logger.warn(`AI batch cancel failed for ${failed} batch(es)`);
  }

  /**
   * `unavailable` while the user's latest finished (or retrying) job failed for want of the
   * provider within the window; a later success clears it.
   */
  private async providerStatus(userId: string): Promise<AiProviderStatus> {
    const latest = await this.prisma.aiJob.findFirst({
      where: {
        userId,
        OR: [
          { status: { in: [AI_JOB_STATE.Done, AI_JOB_STATE.Failed] } },
          { status: AI_JOB_STATE.Pending, reason: AI_JOB_REASON.Unavailable },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: { status: true, reason: true, updatedAt: true },
    });
    const recent =
      latest !== null &&
      latest.status !== AI_JOB_STATE.Done &&
      latest.reason === AI_JOB_REASON.Unavailable &&
      Date.now() - latest.updatedAt.getTime() < AI_STATUS_LIMIT.UnavailableWindowMs;
    return recent ? AI_PROVIDER_STATUS.Unavailable : AI_PROVIDER_STATUS.Ok;
  }

  /** Pending jobs and the backfill block (`POST /api/ai/tick`, backfill routes). */
  async progress(userId: string): Promise<AiTickResponse> {
    const stored = await this.read(this.prisma, userId);
    const entitlements = await this.entitlements(this.prisma, userId);
    const [pendingJobs, eligible, search] = await Promise.all([
      this.pendingJobs(userId),
      this.eligibleForBackfill(userId, stored.enabledAt),
      this.searchStatus.status(userId, stored, entitlements.aiTier),
    ]);
    return { pendingJobs, backfill: toBackfillStatus(stored, eligible), search };
  }

  private pendingJobs(userId: string): Promise<number> {
    return this.prisma.aiJob.count({
      where: { userId, status: { in: [AI_JOB_STATE.Pending, AI_JOB_STATE.Running] } },
    });
  }

  /** Live links saved before AI was turned on that have no AI result (none, failed or skipped). */
  eligibleForBackfill(userId: string, enabledAt: Date | null): Promise<number> {
    return this.prisma.link.count({
      where: {
        userId,
        deletedAt: null,
        summary: null,
        createdAt: { lt: enabledAt ?? new Date() },
        OR: [{ aiStatus: null }, { aiStatus: { in: [AI_JOB_STATE.Failed, AI_JOB_STATE.Skipped] } }],
      },
    });
  }
}
