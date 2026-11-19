import { Injectable, Logger } from '@nestjs/common';
import { AI_JOB_REASON, type AiJobReason, type AiTier } from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { readAiFullAccessEmails } from '../config/ai-full-access-config';
import { AiApplyService } from '../apply/ai-apply.service';
import { AiExcerptService } from '../excerpt/ai-excerpt.service';
import { toAiParts } from '../jobs/requested-parts';
import { AI_JOB_SOURCE } from '../models/ai-job-source.const';
import { AI_JOB_STATE } from '../models/ai-job-state.const';
import { AI_RUNNER_LIMIT } from '../models/ai-runner-limit.const';
import type { AiJobState } from '../models/ai-job-state.type';
import type { AiProvider } from '../models/ai-provider.interface';
import type { ClaimedJob } from '../models/claimed-job.interface';
import type { DraftInput } from '../models/draft-input.interface';
import type { LinkJobInput } from '../models/link-job-input.interface';
import type { LinkJobOutcome } from '../models/link-job-outcome.type';
import type { PageExcerpt } from '../models/page-excerpt.interface';
import type { Reservation } from '../models/reservation.interface';
import { parseLinkOutput } from '../prompt/parse-link-output';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { aiEntitlements } from '../settings/ai-entitlements';
import { AiSettingsService } from '../settings/ai-settings.service';
import { AiUsageService } from '../usage/ai-usage.service';
import { loadLinkVocabulary } from './load-link-vocabulary';
import { loadSiteExamples } from './load-site-examples';

const NO_EXCERPT: PageExcerpt = { excerpt: null, description: null };

/**
 * Runs link jobs (ADR 0049 point 2): claim with a lease, count the quota, read the page (only while
 * "Fetch titles and previews" is on, never inside a transaction), call the user's provider, validate
 * the answer and hand it to `AiApplyService`. Outages go back to the queue with a growing delay, at
 * most `AI_RUNNER_LIMIT.MaxAttempts` attempts; a refusal or an invalid answer fails at once. Logs carry
 * the job id, status and reason only, never the prompt, the page or the answer. Reused by the tick,
 * the sweep and rewrites (backfill results go through `AiApplyService` directly).
 */
@Injectable()
export class AiRunnerService {
  private readonly logger = new Logger(AiRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly usage: AiUsageService,
    private readonly excerpts: AiExcerptService,
    private readonly registry: AiProviderRegistry,
    private readonly apply: AiApplyService,
  ) {}

  /** Runs jobs of one user, a few at a time, starting new ones only within the budget. */
  async runMany(
    userId: string,
    jobIds: readonly string[],
    budgetMs: number = AI_RUNNER_LIMIT.DeferredBudgetMs,
  ): Promise<void> {
    const deadline = Date.now() + budgetMs;
    const queue = [...jobIds];
    const worker = async (): Promise<void> => {
      while (Date.now() < deadline) {
        const jobId = queue.shift();
        if (jobId === undefined) return;
        await this.run(jobId, userId);
      }
    };
    const workers = Math.min(AI_RUNNER_LIMIT.Concurrency, queue.length);
    await Promise.all(Array.from({ length: workers }, worker));
  }

  /**
   * Runs one job of the user if it can be claimed now (pending and due, or its lease expired). A
   * draft's input comes from Add link (in memory); once attached, the link is read instead.
   */
  async run(jobId: string, userId: string, draft?: DraftInput): Promise<void> {
    const job = await this.claim(jobId, userId);
    if (!job) return;
    const reserved: Reservation = { month: null };
    try {
      await this.process(job, draft, reserved);
    } catch (error) {
      this.logger.error(
        `AI job ${job.id} errored (${error instanceof Error ? error.name : 'unknown'})`,
      );
      // No result reached the link: give the month's link back, so a retry (which reserves again)
      // or the final failure never costs the user twice or for nothing.
      if (reserved.month !== null) {
        await this.refund(job, reserved.month).catch(() => undefined);
      }
      await this.retryOrFail(job).catch(() => undefined);
    }
  }

  private async claim(jobId: string, userId: string): Promise<ClaimedJob | null> {
    const rows = await this.prisma.$queryRaw<(Omit<ClaimedJob, 'parts'> & { parts: string[] })[]>`
      UPDATE ai_jobs
      SET status = ${AI_JOB_STATE.Running}, attempts = attempts + 1,
        lease_until = now() + make_interval(secs => ${AI_RUNNER_LIMIT.LeaseSeconds}),
        updated_at = now()
      WHERE id = (
        SELECT id FROM ai_jobs
        WHERE id = ${jobId}::uuid AND user_id = ${userId}::uuid
          AND attempts < ${AI_RUNNER_LIMIT.MaxAttempts}
          AND (
            (status = ${AI_JOB_STATE.Pending} AND (not_before IS NULL OR not_before <= now()))
            OR (status = ${AI_JOB_STATE.Running} AND lease_until < now())
          )
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, user_id AS "userId", link_id AS "linkId", source, parts, language,
        attempts::int AS attempts`;
    const row = rows[0];
    return row ? { ...row, parts: toAiParts(row.parts) } : null;
  }

  private async process(
    job: ClaimedJob,
    draft: DraftInput | undefined,
    reserved: Reservation,
  ): Promise<void> {
    const account = await this.prisma.user.findUnique({
      where: { id: job.userId },
      select: {
        isDemo: true,
        fetchPreviews: true,
        email: true,
        emailVerified: true,
        plan: true,
        aiPack: true,
      },
    });
    if (!account) return this.settle(job, AI_JOB_STATE.Failed, AI_JOB_REASON.Unavailable);
    const stored = await this.settings.read(this.prisma, job.userId);
    if (!stored.settings.enabled) {
      return this.settle(job, AI_JOB_STATE.Skipped, AI_JOB_REASON.Off);
    }
    const source = await this.inputOf(job, draft);
    if (!source) return this.settle(job, AI_JOB_STATE.Failed, AI_JOB_REASON.Unavailable);

    const tier = aiEntitlements(account, readAiFullAccessEmails()).aiTier;
    const reservation = await this.reserve(job, tier);
    if (reservation === null) return this.settle(job, AI_JOB_STATE.Skipped, AI_JOB_REASON.Quota);
    reserved.month = reservation;

    const page = account.fetchPreviews ? await this.excerpts.load(source.url) : NO_EXCERPT;
    const vocabulary = await loadLinkVocabulary(this.prisma, job.userId);
    const [examples = []] = await loadSiteExamples(
      this.prisma,
      job.userId,
      [{ url: source.url, linkId: job.linkId }],
      vocabulary.folderIdByKey,
      vocabulary.tags,
    );
    const input: LinkJobInput = {
      parts: job.parts,
      language: job.language,
      url: source.url,
      title: source.title,
      description: source.description ?? page.description,
      note: stored.settings.includeNotes ? source.note : null,
      excerpt: page.excerpt,
      tags: vocabulary.tags,
      folders: vocabulary.folders,
      wantsTitle: job.linkId === null,
      examples,
    };
    const outcome = await this.call(this.registry.for(account), input);

    if (outcome.type === 'refusal') {
      return this.settle(job, AI_JOB_STATE.Failed, AI_JOB_REASON.Rejected);
    }
    if (outcome.type === 'error') {
      // Refunded here once; an error after this point must not refund again.
      reserved.month = null;
      await this.refund(job, reservation);
      return outcome.retryable
        ? this.retryOrFail(job)
        : this.settle(job, AI_JOB_STATE.Failed, AI_JOB_REASON.Unavailable);
    }
    const parsed = parseLinkOutput(outcome.output, {
      parts: job.parts,
      tags: vocabulary.tags,
      title: { wanted: input.wantsTitle, page: source.title },
      folders: vocabulary.folders,
    });
    if (!parsed) return this.settle(job, AI_JOB_STATE.Failed, AI_JOB_REASON.Rejected);
    await this.apply.finish(job.id, job.userId, {
      tags: parsed.tags,
      newTags: parsed.newTags,
      moreTags: parsed.moreTags,
      folderId:
        parsed.folder === null ? null : (vocabulary.folderIdByKey.get(parsed.folder) ?? null),
      summary: parsed.summary,
      title: parsed.title,
      kind: parsed.kind,
    });
  }

  /** The link as saved (once there is one), else what Add link sent for the draft. */
  private async inputOf(
    job: ClaimedJob,
    draft: DraftInput | undefined,
  ): Promise<DraftInput | null> {
    if (job.linkId === null) return draft ?? null;
    const link = await this.prisma.link.findFirst({
      where: { id: job.linkId, userId: job.userId },
      select: { url: true, title: true, note: true },
    });
    if (!link) return null;
    return {
      url: link.url,
      title: link.title,
      description: draft?.description ?? null,
      note: link.note,
    };
  }

  /**
   * Counts the job against the monthly limit; answers the month (for a refund) or `null` when the
   * limit is reached. Backfill jobs are counted per chunk against their own allowance instead.
   */
  private async reserve(job: ClaimedJob, tier: AiTier): Promise<string | null> {
    if (job.source === AI_JOB_SOURCE.Backfill) return '';
    return this.usage.reserve(job.userId, tier);
  }

  private async refund(job: ClaimedJob, month: string): Promise<void> {
    if (job.source === AI_JOB_SOURCE.Backfill || month === '') return;
    await this.usage.refund(job.userId, month);
  }

  /** A provider never throws by contract; anything that does anyway counts as an outage. */
  private async call(provider: AiProvider, input: LinkJobInput): Promise<LinkJobOutcome> {
    try {
      return await provider.runLinkJob(input);
    } catch {
      return { type: 'error', retryable: true };
    }
  }

  private async retryOrFail(job: ClaimedJob): Promise<void> {
    if (job.attempts >= AI_RUNNER_LIMIT.MaxAttempts) {
      return this.settle(job, AI_JOB_STATE.Failed, AI_JOB_REASON.Unavailable);
    }
    const delays = AI_RUNNER_LIMIT.RetryDelaysMs;
    const delay = delays[Math.min(job.attempts, delays.length) - 1] ?? delays[0];
    this.logger.warn(`AI job ${job.id} retry ${job.attempts} (${AI_JOB_REASON.Unavailable})`);
    await this.apply.retry(job.id, job.userId, delay);
  }

  private async settle(job: ClaimedJob, status: AiJobState, reason: AiJobReason): Promise<void> {
    if (status === AI_JOB_STATE.Failed) this.logger.warn(`AI job ${job.id} failed (${reason})`);
    await this.apply.settle(job.id, job.userId, status, reason);
  }
}
