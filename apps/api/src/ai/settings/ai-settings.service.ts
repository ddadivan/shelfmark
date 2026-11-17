import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AI_BACKFILL_STATE,
  AI_ERROR_MESSAGE,
  AI_JOB_REASON,
  AI_PROVIDER_STATUS,
  type AiEntitlements,
  type AiProviderStatus,
  type AiSettingsResponse,
  type UpdateAiSettingsRequest,
} from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { readAiFullAccessEmails } from '../config/ai-full-access-config';
import { AI_BATCH_STATE } from '../models/ai-batch-state.const';
import { AI_JOB_STATE } from '../models/ai-job-state.const';
import { AI_STATUS_LIMIT } from '../models/ai-status-limit.const';
import type { AiDbClient } from '../models/ai-db-client.type';
import type { CanceledBatch } from '../models/canceled-batch.interface';
import type { StoredAiSettings } from '../models/stored-ai-settings.interface';
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
  enabledAt: true,
  introSeenAt: true,
  backfillState: true,
  backfillTotal: true,
  backfillDone: true,
  backfillUsed: true,
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
      select: { email: true, plan: true, aiPack: true },
    });
    if (!account) throw new NotFoundException();
    return aiEntitlements(account, readAiFullAccessEmails());
  }

  async get(userId: string): Promise<AiSettingsResponse> {
    const entitlements = await this.entitlements(this.prisma, userId);
    const stored = await this.read(this.prisma, userId);
    const [usage, providerStatus, pendingJobs, eligible] = await Promise.all([
      this.usage.read(userId, entitlements.aiTier, stored.backfillUsed),
      this.providerStatus(userId),
      this.pendingJobs(userId),
      this.eligibleForBackfill(userId, stored.enabledAt),
    ]);
    return {
      settings: stored.settings,
      introSeen: stored.introSeenAt !== null,
      entitlements,
      usage,
      providerStatus,
      pendingJobs,
      backfill: toBackfillStatus(stored, eligible),
    };
  }

  async update(userId: string, request: UpdateAiSettingsRequest): Promise<AiSettingsResponse> {
    if (Object.values(request).every((value) => value === undefined)) {
      throw new BadRequestException(AI_ERROR_MESSAGE.NothingToUpdate);
    }
    const canceled = await this.prisma.$transaction(async (tx) => {
      const current = await this.read(tx, userId);
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
      return request.enabled === false ? this.stopQueued(tx, userId) : [];
    });
    await this.cancelBatches(canceled);
    return this.get(userId);
  }

  /** Skips the user's queued jobs and closes their open batches; answers the batches to cancel. */
  private async stopQueued(tx: AiDbClient, userId: string): Promise<CanceledBatch[]> {
    await tx.$executeRaw`
      WITH stopped AS (
        UPDATE ai_jobs
        SET status = ${AI_JOB_STATE.Skipped}, reason = ${AI_JOB_REASON.Off}, lease_until = NULL,
          not_before = NULL, result = NULL, updated_at = now()
        WHERE user_id = ${userId}::uuid
          AND status IN (${AI_JOB_STATE.Pending}, ${AI_JOB_STATE.Running})
        RETURNING link_id
      )
      UPDATE links SET ai_status = ${AI_JOB_STATE.Skipped}
      WHERE user_id = ${userId}::uuid
        AND id IN (SELECT link_id FROM stopped WHERE link_id IS NOT NULL)`;
    return tx.$queryRaw<CanceledBatch[]>`
      UPDATE ai_batches SET status = ${AI_BATCH_STATE.Canceled}, ended_at = now()
      WHERE user_id = ${userId}::uuid AND status = ${AI_BATCH_STATE.Submitted}
      RETURNING provider, provider_batch_id AS "providerBatchId"`;
  }

  /** Best effort after the commit: a batch the provider cannot cancel just ends unread. */
  private async cancelBatches(batches: readonly CanceledBatch[]): Promise<void> {
    let failed = 0;
    for (const batch of batches) {
      try {
        await this.registry.forBatch(batch.provider).cancelLinkBatch(batch.providerBatchId);
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

  private pendingJobs(userId: string): Promise<number> {
    return this.prisma.aiJob.count({
      where: { userId, status: { in: [AI_JOB_STATE.Pending, AI_JOB_STATE.Running] } },
    });
  }

  /** Live links saved before AI was turned on that have no AI result (none, failed or skipped). */
  private eligibleForBackfill(userId: string, enabledAt: Date | null): Promise<number> {
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
