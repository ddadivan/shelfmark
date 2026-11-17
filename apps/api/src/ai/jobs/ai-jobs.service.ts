import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AI_ERROR_MESSAGE,
  AI_JOB_REASON,
  AI_JOB_STATUS,
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  SUMMARY_SOURCE,
  type AiJobResponse,
  type AuthUser,
  type CreateAiDraftRequest,
  type LinkSuggestion,
  type SuggestionKind,
} from '@shelfmark/contracts';
import type { Prisma } from '../../generated/prisma/client';
import { hasPrismaCode } from '../../common/prisma/has-prisma-code';
import { PRISMA_ERROR_CODE } from '../../common/prisma/prisma-error-code.const';
import { toAiJobStatus } from '../../links/to-link-response';
import { savedUrl } from '../../links/link-save-prefs';
import { PrismaService } from '../../prisma/prisma.service';
import { AiApplyService } from '../apply/ai-apply.service';
import { AiBackgroundService } from '../background/ai-background.service';
import { AI_JOB_SOURCE } from '../models/ai-job-source.const';
import { AI_JOB_STATE } from '../models/ai-job-state.const';
import type { AiDbClient } from '../models/ai-db-client.type';
import type { AiEnqueueResult } from '../models/ai-enqueue-result.interface';
import type { AiRequestContext } from '../models/ai-request-context.interface';
import type { EnqueueTarget } from '../models/enqueue-target.interface';
import type { LockedDraft } from '../models/locked-draft.interface';
import type { StoredAiSettings } from '../models/stored-ai-settings.interface';
import { SUGGESTION_ROW_STATE } from '../models/suggestion-row-state.const';
import { AiRunnerService } from '../runner/ai-runner.service';
import { AiSettingsService } from '../settings/ai-settings.service';
import { AiUsageService } from '../usage/ai-usage.service';
import { draftSuggestionId } from './draft-suggestion-id';
import { requestedParts, toAiParts } from './requested-parts';
import { resolveJobLanguage } from './resolve-job-language';
import { toAiJobReason } from './to-ai-job-reason';
import { toStoredLinkResult } from './to-stored-link-result';

type Tx = Prisma.TransactionClient;

const NO_JOBS: AiEnqueueResult = { jobIds: [], touched: false };

/**
 * Link jobs (ADR 0048 points 1 and 4): enqueue inside the save transaction (only while AI is on and
 * at least one part is open), draft jobs from Add link, and the attach of a draft by
 * `(userId, aiDraftId)` inside the create transaction. Started after the commit through
 * `AiBackgroundService`. Every query filters by the session `userId`.
 */
@Injectable()
export class AiJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly usage: AiUsageService,
    private readonly apply: AiApplyService,
    private readonly runner: AiRunnerService,
    private readonly background: AiBackgroundService,
  ) {}

  /**
   * Locks the user's unattached draft job of that id (`FOR UPDATE`). Call it right after the
   * `folders:` lock and before anything takes `tags:` (ADR 0033 / 0048 lock order).
   */
  async lockDraft(tx: Tx, userId: string, draftId: string): Promise<LockedDraft | null> {
    const rows = await tx.$queryRaw<LockedDraft[]>`
      SELECT id, status, reason, parts, result FROM ai_jobs
      WHERE user_id = ${userId}::uuid AND draft_id = ${draftId}::uuid AND link_id IS NULL
      FOR UPDATE`;
    return rows[0] ?? null;
  }

  /**
   * The AI step of `POST /api/links`, inside its transaction after the insert: attaches the draft
   * (applying a finished result there) or enqueues a save job. Nothing at all while AI is off.
   */
  async afterCreate(
    tx: Tx,
    userId: string,
    target: EnqueueTarget,
    draft: LockedDraft | null,
    context: AiRequestContext,
  ): Promise<AiEnqueueResult> {
    const stored = await this.settings.read(tx, userId);
    if (!stored.settings.enabled) return NO_JOBS;
    if (draft) return this.attach(tx, userId, target, draft, stored);
    return this.enqueueWith(tx, userId, [target], stored, context);
  }

  /** One save job per link whose parts are open (`POST /api/links/batch`), in the caller's transaction. */
  async enqueue(
    tx: Tx,
    userId: string,
    targets: readonly EnqueueTarget[],
    context: AiRequestContext,
  ): Promise<AiEnqueueResult> {
    if (targets.length === 0) return NO_JOBS;
    const stored = await this.settings.read(tx, userId);
    if (!stored.settings.enabled) return NO_JOBS;
    return this.enqueueWith(tx, userId, targets, stored, context);
  }

  /** Starts jobs after the commit (and after the response on Vercel). */
  start(userId: string, jobIds: readonly string[]): void {
    if (jobIds.length === 0) return;
    this.background.defer(() => this.runner.runMany(userId, jobIds));
  }

  /**
   * `POST /api/ai/drafts`: creates the draft job (or answers the existing one for that `draftId`)
   * and starts it with the dialog's data held in memory. Off, no part or no quota answer `skipped`.
   */
  async createDraft(
    user: AuthUser,
    request: CreateAiDraftRequest,
    context: AiRequestContext,
  ): Promise<AiJobResponse> {
    const userId = user.id;
    const input = {
      url: savedUrl(request.url),
      title: request.title ?? null,
      description: request.description ?? null,
      note: request.note ?? null,
    };
    const existing = await this.prisma.aiJob.findFirst({
      where: { userId, draftId: request.draftId },
      select: { id: true, linkId: true, status: true, reason: true },
    });
    if (existing) {
      // "Try again" after an outage: the same draft runs once more with the dialog's data.
      if (
        existing.linkId === null &&
        existing.status === AI_JOB_STATE.Failed &&
        existing.reason === AI_JOB_REASON.Unavailable
      ) {
        await this.prisma.aiJob.update({
          where: { id: existing.id, userId },
          data: { status: AI_JOB_STATE.Pending, reason: null, attempts: 0, notBefore: null },
        });
        this.background.defer(() => this.runner.run(existing.id, userId, input));
      }
      return this.getJob(userId, existing.id);
    }

    const stored = await this.settings.read(this.prisma, userId);
    const parts = requestedParts(stored.settings, { folderSet: false, tagsSet: false });
    if (!stored.settings.enabled || parts.length === 0) {
      return this.skipped(request.draftId, AI_JOB_REASON.Off);
    }
    const entitlements = await this.settings.entitlements(this.prisma, userId);
    const room = await this.usage.hasRoom(userId, entitlements.aiTier);
    const language = await this.language(this.prisma, userId, stored, context);
    let jobId: string;
    try {
      jobId = (
        await this.prisma.aiJob.create({
          data: {
            userId,
            draftId: request.draftId,
            source: AI_JOB_SOURCE.Draft,
            status: room ? AI_JOB_STATE.Pending : AI_JOB_STATE.Skipped,
            reason: room ? null : AI_JOB_REASON.Quota,
            parts,
            language,
          },
          select: { id: true },
        })
      ).id;
    } catch (error) {
      if (!hasPrismaCode(error, PRISMA_ERROR_CODE.UniqueViolation)) throw error;
      // A concurrent repeat of the same draft won: answer its job.
      const winner = await this.prisma.aiJob.findFirstOrThrow({
        where: { userId, draftId: request.draftId },
        select: { id: true },
      });
      return this.getJob(userId, winner.id);
    }
    if (room) this.background.defer(() => this.runner.run(jobId, userId, input));
    return this.getJob(userId, jobId);
  }

  /** `GET /api/ai/jobs/:id`: the user's job and its result so far; foreign or missing is 404. */
  async getJob(userId: string, id: string): Promise<AiJobResponse> {
    const job = await this.prisma.aiJob.findFirst({
      where: { id, userId },
      select: { id: true, linkId: true, status: true, reason: true, result: true },
    });
    if (!job) throw new NotFoundException(AI_ERROR_MESSAGE.JobNotFound);
    const status = toAiJobStatus(job.status) ?? AI_JOB_STATUS.Pending;
    const response: AiJobResponse = {
      id: job.id,
      status,
      reason: toAiJobReason(job.reason),
      suggestions: [],
      summary: null,
    };
    if (status !== AI_JOB_STATUS.Done) return response;
    if (job.linkId === null) {
      const result = toStoredLinkResult(job.result);
      if (!result) return response;
      const suggestions: LinkSuggestion[] = [
        ...(result.folderId === null
          ? []
          : [this.draftSuggestion(job.id, SUGGESTION_KIND.Folder, null, result.folderId)]),
        ...result.tags.map((name) => this.draftSuggestion(job.id, SUGGESTION_KIND.Tag, name, null)),
        ...(result.newTag === null
          ? []
          : [this.draftSuggestion(job.id, SUGGESTION_KIND.NewTag, result.newTag, null)]),
      ];
      return { ...response, suggestions, summary: result.summary };
    }
    const [link, rows] = await Promise.all([
      this.prisma.link.findFirst({
        where: { id: job.linkId, userId },
        select: { summary: true, summarySource: true },
      }),
      this.prisma.linkSuggestion.findMany({
        where: {
          userId,
          linkId: job.linkId,
          state: { in: [SUGGESTION_ROW_STATE.Suggested, SUGGESTION_ROW_STATE.AutoApplied] },
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, kind: true, state: true, tagName: true, folderId: true },
      }),
    ]);
    return {
      ...response,
      suggestions: rows.map((row) => ({
        id: row.id,
        kind: toSuggestionKind(row.kind),
        state:
          row.state === SUGGESTION_ROW_STATE.AutoApplied
            ? SUGGESTION_STATE.AutoApplied
            : SUGGESTION_STATE.Suggested,
        tagName: row.tagName,
        folderId: row.folderId,
      })),
      summary: link?.summarySource === SUMMARY_SOURCE.Ai ? link.summary : null,
    };
  }

  private async attach(
    tx: Tx,
    userId: string,
    target: EnqueueTarget,
    draft: LockedDraft,
    stored: StoredAiSettings,
  ): Promise<AiEnqueueResult> {
    // What the save filled is no longer asked for (the user or a rule chose it).
    const open = requestedParts(stored.settings, target);
    const parts = toAiParts(draft.parts).filter((part) => open.includes(part));
    const linkId = target.linkId;
    if (draft.status === AI_JOB_STATE.Done) {
      const result = toStoredLinkResult(draft.result);
      const produced =
        result !== null && parts.length > 0
          ? await this.apply.applyToLink(tx, {
              userId,
              linkId,
              jobId: draft.id,
              source: AI_JOB_SOURCE.Draft,
              parts,
              result,
              settings: stored.settings,
            })
          : false;
      await tx.$executeRaw`
        UPDATE ai_jobs SET link_id = ${linkId}::uuid, parts = ${parts}::text[], result = NULL,
          reason = ${produced ? null : AI_JOB_REASON.NothingFound}, updated_at = now()
        WHERE id = ${draft.id}::uuid AND user_id = ${userId}::uuid`;
      await this.setLinkStatus(tx, userId, linkId, AI_JOB_STATE.Done);
      return { jobIds: [], touched: true };
    }
    // An outage before the save: the job runs again, now on the saved link.
    const requeue =
      draft.status === AI_JOB_STATE.Failed && draft.reason === AI_JOB_REASON.Unavailable;
    const status = requeue ? AI_JOB_STATE.Pending : draft.status;
    await tx.$executeRaw`
      UPDATE ai_jobs SET link_id = ${linkId}::uuid, parts = ${parts}::text[], status = ${status},
        reason = ${requeue ? null : draft.reason}, not_before = NULL, updated_at = now()
      WHERE id = ${draft.id}::uuid AND user_id = ${userId}::uuid`;
    await this.setLinkStatus(
      tx,
      userId,
      linkId,
      status === AI_JOB_STATE.Running ? AI_JOB_STATE.Pending : status,
    );
    // A pending job may not have been claimed yet; starting it again is harmless (the claim is atomic).
    return { jobIds: status === AI_JOB_STATE.Pending ? [draft.id] : [], touched: true };
  }

  private async enqueueWith(
    tx: Tx,
    userId: string,
    targets: readonly EnqueueTarget[],
    stored: StoredAiSettings,
    context: AiRequestContext,
  ): Promise<AiEnqueueResult> {
    const planned = targets
      .map((target) => ({ linkId: target.linkId, parts: requestedParts(stored.settings, target) }))
      .filter((entry) => entry.parts.length > 0);
    if (planned.length === 0) return NO_JOBS;
    const language = await this.language(tx, userId, stored, context);
    const rows = await tx.aiJob.createManyAndReturn({
      data: planned.map((entry) => ({
        userId,
        linkId: entry.linkId,
        source: AI_JOB_SOURCE.Save,
        parts: entry.parts,
        language,
      })),
      select: { id: true },
    });
    const linkIds = planned.map((entry) => entry.linkId);
    await tx.$executeRaw`
      UPDATE links SET ai_status = ${AI_JOB_STATE.Pending}
      WHERE user_id = ${userId}::uuid AND id = ANY(${linkIds}::uuid[])`;
    return { jobIds: rows.map((row) => row.id), touched: true };
  }

  private async language(
    db: AiDbClient,
    userId: string,
    stored: StoredAiSettings,
    context: AiRequestContext,
  ): Promise<string> {
    const user = await db.user.findUnique({ where: { id: userId }, select: { language: true } });
    return resolveJobLanguage(
      stored.settings.summaryLanguage,
      user?.language ?? '',
      context.acceptLanguage,
    );
  }

  private async setLinkStatus(
    tx: Tx,
    userId: string,
    linkId: string,
    status: string,
  ): Promise<void> {
    await tx.$executeRaw`
      UPDATE links SET ai_status = ${status}
      WHERE id = ${linkId}::uuid AND user_id = ${userId}::uuid`;
  }

  private skipped(id: string, reason: AiJobResponse['reason']): AiJobResponse {
    return { id, status: AI_JOB_STATUS.Skipped, reason, suggestions: [], summary: null };
  }

  private draftSuggestion(
    jobId: string,
    kind: SuggestionKind,
    tagName: string | null,
    folderId: string | null,
  ): LinkSuggestion {
    return {
      id: draftSuggestionId(jobId, kind, tagName ?? folderId ?? ''),
      kind,
      state: SUGGESTION_STATE.Suggested,
      tagName,
      folderId,
    };
  }
}

const KINDS: readonly string[] = Object.values(SUGGESTION_KIND);

function isSuggestionKind(value: string): value is SuggestionKind {
  return KINDS.includes(value);
}

function toSuggestionKind(value: string): SuggestionKind {
  return isSuggestionKind(value) ? value : SUGGESTION_KIND.Tag;
}
