import { Injectable } from '@nestjs/common';
import {
  AI_FEATURE_MODE,
  AI_JOB_REASON,
  SUGGESTION_KIND,
  SUMMARY_SOURCE,
  type AiJobReason,
} from '@shelfmark/contracts';
import { markEmbeddingsStale } from '../embeddings/mark-embeddings-stale';
import { escapeLike } from '../../common/util/escape-like';
import { FoldersService } from '../../folders/folders.service';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TagsService } from '../../tags/tags.service';
import { AI_JOB_SOURCE } from '../models/ai-job-source.const';
import { AI_JOB_STATE } from '../models/ai-job-state.const';
import { AI_PART } from '../models/ai-part.const';
import type { AiJobState } from '../models/ai-job-state.type';
import type { ApplyContext } from '../models/apply-context.interface';
import type { LockedJobRow } from '../models/locked-job-row.interface';
import type { SuggestionRow } from '../models/suggestion-row.interface';
import type { SuggestionWrite } from '../models/suggestion-write.interface';
import type { StoredLinkResult } from '../models/stored-link-result.interface';
import { SUGGESTION_ROW_STATE } from '../models/suggestion-row-state.const';
import { AiSettingsService } from '../settings/ai-settings.service';

type Tx = Prisma.TransactionClient;

/** Sources whose results may change a link (Automatic mode); backfill and rewrite never do. */
const AUTO_SOURCES: readonly string[] = [AI_JOB_SOURCE.Save, AI_JOB_SOURCE.Draft];

/**
 * Writes job results (ADR 0049). Every write happens in one transaction with the lock order
 * `folders:` → the job row (`FOR UPDATE`) → `tags:`, and only while the job is still `running`: a job
 * AI was turned off for (skipped) or that another claim settled is discarded. Rules: the summary
 * never replaces the user's (`summary_source = 'user'`); suggestions are the user's own tags and live
 * folders plus at most one new tag, never one the user dismissed or accepted; Automatic mode applies
 * only for `save` / `draft` jobs, the folder only while the link is still in Unsorted and tags only
 * while it has none, existing tags only. The model's `kind` is never written.
 */
@Injectable()
export class AiApplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
    private readonly tags: TagsService,
    private readonly settings: AiSettingsService,
  ) {}

  /** Stores a validated result: on the link, or on the job while its draft has no link yet. */
  async finish(jobId: string, userId: string, result: StoredLinkResult): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.folders.lockTree(tx, userId);
      const rows = await tx.$queryRaw<LockedJobRow[]>`
        SELECT link_id AS "linkId", source, parts, status FROM ai_jobs
        WHERE id = ${jobId}::uuid AND user_id = ${userId}::uuid
        FOR UPDATE`;
      const job = rows[0];
      if (job?.status !== AI_JOB_STATE.Running) return;
      const stored = await this.settings.read(tx, userId);
      if (!stored.settings.enabled) {
        await this.settleIn(tx, jobId, userId, AI_JOB_STATE.Skipped, AI_JOB_REASON.Off);
        return;
      }
      if (job.linkId === null) {
        await tx.aiJob.update({
          where: { id: jobId, userId },
          data: {
            status: AI_JOB_STATE.Done,
            reason: null,
            leaseUntil: null,
            result: {
              tags: result.tags,
              newTag: result.newTag,
              folderId: result.folderId,
              summary: result.summary,
              title: result.title,
            },
          },
        });
        return;
      }
      const produced = await this.applyToLink(tx, {
        userId,
        linkId: job.linkId,
        jobId,
        source: job.source,
        parts: job.parts,
        result,
        settings: stored.settings,
      });
      await tx.aiJob.update({
        where: { id: jobId, userId },
        data: {
          status: AI_JOB_STATE.Done,
          reason: produced ? null : AI_JOB_REASON.NothingFound,
          leaseUntil: null,
          // A backfill job kept its folder keys here while its batch ran.
          result: Prisma.DbNull,
        },
      });
    });
  }

  /** Ends a running job without a result (failed or skipped) and mirrors it on the link. */
  async settle(
    jobId: string,
    userId: string,
    status: AiJobState,
    reason: AiJobReason,
  ): Promise<void> {
    await this.settleIn(this.prisma, jobId, userId, status, reason);
  }

  /** Puts a running job back in the queue after a provider outage (`not_before` = now + delay). */
  async retry(jobId: string, userId: string, delayMs: number): Promise<void> {
    const notBefore = new Date(Date.now() + delayMs);
    await this.prisma.$executeRaw`
      UPDATE ai_jobs
      SET status = ${AI_JOB_STATE.Pending}, reason = ${AI_JOB_REASON.Unavailable},
        not_before = ${notBefore}, lease_until = NULL, updated_at = now()
      WHERE id = ${jobId}::uuid AND user_id = ${userId}::uuid AND status = ${AI_JOB_STATE.Running}`;
  }

  /**
   * Writes one result to one link of the user inside the caller's transaction (which holds the
   * `folders:` lock and the job row). Answers whether anything was written or suggested.
   */
  async applyToLink(tx: Tx, context: ApplyContext): Promise<boolean> {
    const { userId, linkId, result, settings } = context;
    const link = await tx.link.findFirst({
      where: { id: linkId, userId },
      select: {
        folderId: true,
        deletedAt: true,
        summarySource: true,
        tags: { select: { tag: { select: { name: true } } } },
      },
    });
    if (!link) return false;
    // A trashed link still gets its summary and suggestions (a restore brings them back with it, and
    // the user paid for the answer); Automatic mode never moves or tags it while it is in Trash.
    const parts = new Set<string>(context.parts);
    const live = link.deletedAt === null && AUTO_SOURCES.includes(context.source);
    let produced = false;

    if (
      parts.has(AI_PART.Summary) &&
      settings.summaries &&
      result.summary !== null &&
      link.summarySource !== SUMMARY_SOURCE.User
    ) {
      // Plain SQL so `updated_at` stays (an AI write is not an edit); the condition re-checks the
      // user's summary in the same statement.
      const written = await tx.$executeRaw`
        UPDATE links SET summary = ${result.summary}, summary_source = ${SUMMARY_SOURCE.Ai}
        WHERE id = ${linkId}::uuid AND user_id = ${userId}::uuid
          AND (summary_source IS NULL OR summary_source = ${SUMMARY_SOURCE.Ai})`;
      produced = written > 0;
      if (produced) await markEmbeddingsStale(tx, userId, { linkIds: [linkId] });
    }

    const existing = await tx.linkSuggestion.findMany({
      where: { userId, linkId },
      select: { id: true, kind: true, tagName: true, folderId: true, state: true },
    });

    if (
      parts.has(AI_PART.Folder) &&
      settings.folderMode !== AI_FEATURE_MODE.Off &&
      result.folderId !== null &&
      result.folderId !== link.folderId
    ) {
      produced =
        (await this.suggestFolder(tx, context, result.folderId, existing, {
          auto: live && settings.folderMode === AI_FEATURE_MODE.Auto && link.folderId === null,
        })) || produced;
    }

    if (parts.has(AI_PART.Tags) && settings.tagsMode !== AI_FEATURE_MODE.Off) {
      const onLink = new Set(link.tags.map((entry) => entry.tag.name.toLowerCase()));
      produced =
        (await this.suggestTags(tx, context, existing, onLink, {
          auto: live && settings.tagsMode === AI_FEATURE_MODE.Auto && onLink.size === 0,
        })) || produced;
    }

    await tx.$executeRaw`
      UPDATE links SET ai_status = ${AI_JOB_STATE.Done}
      WHERE id = ${linkId}::uuid AND user_id = ${userId}::uuid`;
    return produced;
  }

  private async suggestFolder(
    tx: Tx,
    context: ApplyContext,
    folderId: string,
    existing: readonly SuggestionRow[],
    options: { auto: boolean },
  ): Promise<boolean> {
    const { userId, linkId } = context;
    const prior = existing.find((row) => row.folderId === folderId);
    if (prior && prior.state !== SUGGESTION_ROW_STATE.Suggested) return false;
    const folder = await tx.folder.findFirst({
      where: { id: folderId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!folder) return false;
    let state: string = SUGGESTION_ROW_STATE.Suggested;
    if (options.auto) {
      // Only while the link is still in Unsorted: a folder the user picked meanwhile wins.
      const moved = await tx.$executeRaw`
        UPDATE links SET folder_id = ${folderId}::uuid
        WHERE id = ${linkId}::uuid AND user_id = ${userId}::uuid
          AND folder_id IS NULL AND deleted_at IS NULL`;
      if (moved > 0) state = SUGGESTION_ROW_STATE.AutoApplied;
    }
    await this.upsertSuggestion(tx, context, prior, {
      kind: SUGGESTION_KIND.Folder,
      tagName: null,
      folderId,
      state,
    });
    return true;
  }

  private async suggestTags(
    tx: Tx,
    context: ApplyContext,
    existing: readonly SuggestionRow[],
    onLink: ReadonlySet<string>,
    options: { auto: boolean },
  ): Promise<boolean> {
    const { userId, linkId, result } = context;
    const priorOf = (name: string): SuggestionRow | undefined =>
      existing.find((row) => row.tagName?.toLowerCase() === name.toLowerCase());
    const open = (name: string): boolean => {
      const prior = priorOf(name);
      return (
        !onLink.has(name.toLowerCase()) &&
        (!prior || prior.state === SUGGESTION_ROW_STATE.Suggested)
      );
    };
    const candidates = result.tags.filter(open);
    const newTag = result.newTag !== null && open(result.newTag) ? result.newTag : null;

    const applied = new Set<string>();
    if (options.auto && candidates.length > 0) {
      // `folders:` and the job row are held; the tags lock comes last (ADR 0033 order).
      await this.tags.lockUserTags(tx, userId);
      // Under the tags lock (which every tag write of a link takes): a link the user tagged since
      // it was read keeps the user's tags, and the candidates stay suggestions.
      const tagged = await tx.linkTag.count({ where: { linkId } });
      if (tagged === 0) {
        const own = await tx.tag.findMany({
          where: {
            userId,
            OR: candidates.map((name) => ({
              name: { equals: escapeLike(name), mode: 'insensitive' },
            })),
          },
          select: { id: true, name: true },
        });
        // One own tag per name at most: tag names are unique ignoring case
        // (`tags_user_id_lower_name_key`).
        if (own.length > 0) {
          await tx.linkTag.createMany({
            data: own.map((tag) => ({ linkId, tagId: tag.id })),
            skipDuplicates: true,
          });
          for (const tag of own) applied.add(tag.name.toLowerCase());
          await markEmbeddingsStale(tx, userId, { linkIds: [linkId] });
        }
      }
    }

    for (const name of candidates) {
      await this.upsertSuggestion(tx, context, priorOf(name), {
        kind: SUGGESTION_KIND.Tag,
        tagName: name,
        folderId: null,
        state: applied.has(name.toLowerCase())
          ? SUGGESTION_ROW_STATE.AutoApplied
          : SUGGESTION_ROW_STATE.Suggested,
      });
    }
    if (newTag !== null) {
      await this.upsertSuggestion(tx, context, priorOf(newTag), {
        kind: SUGGESTION_KIND.NewTag,
        tagName: newTag,
        folderId: null,
        state: SUGGESTION_ROW_STATE.Suggested,
      });
    }
    return candidates.length > 0 || newTag !== null;
  }

  private async upsertSuggestion(
    tx: Tx,
    context: ApplyContext,
    prior: SuggestionRow | undefined,
    data: SuggestionWrite,
  ): Promise<void> {
    if (prior) {
      await tx.linkSuggestion.update({
        where: { id: prior.id, userId: context.userId },
        data: { ...data, jobId: context.jobId },
      });
      return;
    }
    await tx.linkSuggestion.create({
      data: { ...data, userId: context.userId, linkId: context.linkId, jobId: context.jobId },
    });
  }

  private async settleIn(
    db: Tx | PrismaService,
    jobId: string,
    userId: string,
    status: AiJobState,
    reason: AiJobReason,
  ): Promise<void> {
    await db.$executeRaw`
      WITH settled AS (
        UPDATE ai_jobs
        SET status = ${status}, reason = ${reason}, lease_until = NULL, not_before = NULL,
          result = NULL, updated_at = now()
        WHERE id = ${jobId}::uuid AND user_id = ${userId}::uuid AND status = ${AI_JOB_STATE.Running}
        RETURNING link_id
      )
      UPDATE links SET ai_status = ${status}
      WHERE user_id = ${userId}::uuid
        AND id IN (SELECT link_id FROM settled WHERE link_id IS NOT NULL)`;
  }
}
