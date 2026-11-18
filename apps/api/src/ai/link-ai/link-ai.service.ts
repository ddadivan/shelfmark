import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AI_APPLIED_PART,
  AI_ERROR_MESSAGE,
  LINK_ERROR_MESSAGE,
  SUGGESTION_KIND,
  SUMMARY_SOURCE,
  type AiAppliedPart,
  type LinkAiState,
  type LinkResponse,
} from '@shelfmark/contracts';
import { FoldersService } from '../../folders/folders.service';
import { LINK_INCLUDE } from '../../links/models/link-include.const';
import { toAiJobStatus, toLinkResponse, toSummarySource } from '../../links/to-link-response';
import { PrismaService } from '../../prisma/prisma.service';
import { TagsService } from '../../tags/tags.service';
import { toAiJobReason } from '../jobs/to-ai-job-reason';
import { AiJobsService } from '../jobs/ai-jobs.service';
import { requestedParts } from '../jobs/requested-parts';
import { AI_JOB_SOURCE } from '../models/ai-job-source.const';
import { AI_JOB_STATE } from '../models/ai-job-state.const';
import { AI_PART } from '../models/ai-part.const';
import type { AiRequestContext } from '../models/ai-request-context.interface';
import { SUGGESTION_ROW_STATE } from '../models/suggestion-row-state.const';
import { AiSettingsService } from '../settings/ai-settings.service';
import { toLinkSuggestion } from '../suggestions/to-link-suggestion';

const OPEN_STATES: string[] = [SUGGESTION_ROW_STATE.Suggested, SUGGESTION_ROW_STATE.AutoApplied];
const QUEUED_STATES: string[] = [AI_JOB_STATE.Pending, AI_JOB_STATE.Running];

/**
 * The AI routes of one link (#390, #391): its state for Edit link, a summary rewrite and the undo of
 * Automatic mode. A trashed, foreign or missing link is 404. Every statement filters by the session
 * `userId`.
 */
@Injectable()
export class LinkAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
    private readonly tags: TagsService,
    private readonly settings: AiSettingsService,
    private readonly jobs: AiJobsService,
  ) {}

  /** `GET /api/links/:id/ai`. */
  async state(userId: string, linkId: string): Promise<LinkAiState> {
    const link = await this.prisma.link.findFirst({
      where: { id: linkId, userId, deletedAt: null },
      select: {
        folderId: true,
        summary: true,
        summarySource: true,
        aiStatus: true,
        tags: { select: { tag: { select: { name: true } } } },
      },
    });
    if (!link) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
    const [job, rows] = await Promise.all([
      this.prisma.aiJob.findFirst({
        where: { userId, linkId },
        orderBy: { createdAt: 'desc' },
        select: { reason: true },
      }),
      this.prisma.linkSuggestion.findMany({
        where: { userId, linkId, state: { in: OPEN_STATES } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, kind: true, state: true, tagName: true, folderId: true },
      }),
    ]);
    const auto = rows.filter((row) => row.state === SUGGESTION_ROW_STATE.AutoApplied);
    const onLink = new Set(link.tags.map((entry) => entry.tag.name.toLowerCase()));
    // Only what is still where AI put it can be undone.
    const folderId =
      auto.find((row) => row.kind === SUGGESTION_KIND.Folder && row.folderId === link.folderId)
        ?.folderId ?? null;
    const tags = auto
      .filter((row) => row.kind === SUGGESTION_KIND.Tag && row.tagName !== null)
      .map((row) => row.tagName ?? '')
      .filter((name) => onLink.has(name.toLowerCase()));
    return {
      aiStatus: toAiJobStatus(link.aiStatus),
      reason: toAiJobReason(job?.reason ?? null),
      summary: link.summary,
      summarySource: link.summary === null ? null : toSummarySource(link.summarySource),
      suggestions: rows.map(toLinkSuggestion),
      autoApplied: folderId === null && tags.length === 0 ? null : { folderId, tags },
    };
  }

  /**
   * `POST /api/links/:id/ai/rewrite`: queues a new summary (and suggestions for a folder or tags the
   * link still lacks) as a `rewrite` job, which counts against the monthly limit and never applies
   * anything by itself. 409 while AI or summaries are off and while the summary is the user's.
   */
  async rewrite(userId: string, linkId: string, context: AiRequestContext): Promise<LinkAiState> {
    const jobIds = await this.prisma.$transaction(async (tx) => {
      // The link row lock serialises two rewrites of one link: the second sees the first one's job.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM links
        WHERE id = ${linkId}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NULL
        FOR UPDATE`;
      if (locked.length === 0) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
      const stored = await this.settings.read(tx, userId);
      const link = await tx.link.findFirst({
        where: { id: linkId, userId, deletedAt: null },
        select: {
          folderId: true,
          summary: true,
          summarySource: true,
          _count: { select: { tags: true } },
        },
      });
      if (!link) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
      const parts = requestedParts(stored.settings, {
        folderSet: link.folderId !== null,
        tagsSet: link._count.tags > 0,
      });
      if (!stored.settings.enabled || !parts.includes(AI_PART.Summary)) {
        throw new ConflictException(AI_ERROR_MESSAGE.AiOff);
      }
      if (link.summary !== null && link.summarySource !== SUMMARY_SOURCE.Ai) {
        throw new ConflictException(AI_ERROR_MESSAGE.SummaryIsUsers);
      }
      const queued = await tx.aiJob.findFirst({
        where: { userId, linkId, status: { in: QUEUED_STATES } },
        select: { id: true },
      });
      if (queued) return [];
      const language = await this.jobs.language(tx, userId, stored, context);
      const job = await tx.aiJob.create({
        data: { userId, linkId, source: AI_JOB_SOURCE.Rewrite, parts, language },
        select: { id: true },
      });
      await tx.$executeRaw`
        UPDATE links SET ai_status = ${AI_JOB_STATE.Pending}
        WHERE id = ${linkId}::uuid AND user_id = ${userId}::uuid`;
      return [job.id];
    });
    this.jobs.start(userId, jobIds);
    return this.state(userId, linkId);
  }

  /**
   * `POST /api/links/:id/ai/undo`: the folder goes back to Unsorted only while the link is still in
   * the folder AI moved it to; tags AI added are removed while they are still on the link. The undone
   * suggestions are dismissed. Plain SQL, so `updated_at` stays (AI's write was not an edit either).
   */
  async undo(userId: string, linkId: string, part: AiAppliedPart): Promise<LinkResponse> {
    return this.prisma.$transaction(async (tx) => {
      // Lock order: `folders:` before `tags:` (ADR 0033).
      await this.folders.lockTree(tx, userId);
      const link = await tx.link.findFirst({
        where: { id: linkId, userId, deletedAt: null },
        select: { folderId: true },
      });
      if (!link) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
      if (part === AI_APPLIED_PART.Folder) {
        const row = await tx.linkSuggestion.findFirst({
          where: {
            userId,
            linkId,
            kind: SUGGESTION_KIND.Folder,
            state: SUGGESTION_ROW_STATE.AutoApplied,
          },
          select: { id: true, folderId: true },
        });
        if (row && link.folderId !== null && row.folderId === link.folderId) {
          await tx.$executeRaw`
            UPDATE links SET folder_id = NULL, pinned_in_folder_at = NULL
            WHERE id = ${linkId}::uuid AND user_id = ${userId}::uuid
              AND folder_id = ${link.folderId}::uuid`;
          await tx.linkSuggestion.updateMany({
            where: { id: row.id, userId },
            data: { state: SUGGESTION_ROW_STATE.Dismissed },
          });
        }
      } else {
        const rows = await tx.linkSuggestion.findMany({
          where: {
            userId,
            linkId,
            kind: SUGGESTION_KIND.Tag,
            state: SUGGESTION_ROW_STATE.AutoApplied,
          },
          select: { id: true, tagName: true },
        });
        const names = rows
          .map((row) => row.tagName?.toLowerCase())
          .filter((name): name is string => name !== undefined);
        if (names.length > 0) {
          await this.tags.lockUserTags(tx, userId);
          await tx.$executeRaw`
            DELETE FROM link_tags AS lt USING tags AS t
            WHERE lt.tag_id = t.id AND lt.link_id = ${linkId}::uuid
              AND t.user_id = ${userId}::uuid AND lower(t.name) = ANY(${names}::text[])`;
          await tx.linkSuggestion.updateMany({
            where: { userId, id: { in: rows.map((row) => row.id) } },
            data: { state: SUGGESTION_ROW_STATE.Dismissed },
          });
        }
      }
      const row = await tx.link.findFirstOrThrow({
        where: { id: linkId, userId },
        include: LINK_INCLUDE,
      });
      return toLinkResponse(row);
    });
  }
}
