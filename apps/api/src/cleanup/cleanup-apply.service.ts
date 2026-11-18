import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  CLEANUP_ERROR_MESSAGE,
  CLEANUP_STATE,
  type CleanupApplyRequest,
  type CleanupApplyResponse,
  type CleanupUndoMerge,
} from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';
import { FoldersService } from '../folders/folders.service';
import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from '../tags/tags.service';
import type { StoredCleanupFindings } from './models/stored-cleanup-findings.interface';
import { readStoredFindings } from './read-stored-findings';

/**
 * "Apply {n} changes" (ADR 0052 point 4), validated against the stored report and the session user:
 * a group or pair id must be in the stored findings, trashed ids must be members of their group and
 * live links of the user, at least one member of a group always stays live, a kept tag must be one of
 * its pair and both tags still the user's. Everything else is skipped, never an error. One
 * transaction, `folders:` before `tags:`: copies go to Trash with one shared `deleted_at` (pins
 * cleared, plain SQL so `updated_at` stays, ADR 0036); merges go through
 * `TagsService.mergeInTransaction` (vectors marked stale there). The answer carries the Undo payload.
 */
@Injectable()
export class CleanupApplyService {
  private readonly logger = new Logger(CleanupApplyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
    private readonly tags: TagsService,
  ) {}

  async apply(userId: string, request: CleanupApplyRequest): Promise<CleanupApplyResponse> {
    if (request.duplicates.length + request.tagMerges.length === 0) {
      throw new BadRequestException(CLEANUP_ERROR_MESSAGE.EmptyApply);
    }
    const result = await this.prisma.$transaction(async (tx) => {
      await this.folders.lockTree(tx, userId);
      const rows = await tx.$queryRaw<{ findings: unknown }[]>`
        SELECT findings FROM cleanup_reports WHERE user_id = ${userId}::uuid FOR UPDATE`;
      const findings = readStoredFindings(rows[0]?.findings);
      let skipped = 0;
      const trash = await this.planTrash(tx, userId, findings, request);
      skipped += trash.skipped;
      const deletedAt = new Date();
      const trashed =
        trash.ids.length === 0
          ? []
          : await tx.$queryRaw<{ id: string }[]>`
              UPDATE links SET deleted_at = ${deletedAt}, pinned_position = NULL,
                pinned_in_folder_at = NULL
              WHERE user_id = ${userId}::uuid AND deleted_at IS NULL
                AND id = ANY(${trash.ids}::uuid[])
              RETURNING id::text AS id`;
      const merges: CleanupUndoMerge[] = [];
      for (const item of request.tagMerges) {
        const merge = await this.mergeOne(tx, userId, findings, item);
        if (merge === null) skipped += 1;
        else merges.push(merge);
      }
      if (trashed.length > 0 || merges.length > 0) {
        await tx.$executeRaw`
          UPDATE cleanup_reports SET state = ${CLEANUP_STATE.Applied}, applied_at = now()
          WHERE user_id = ${userId}::uuid AND state <> ${CLEANUP_STATE.Running}`;
      }
      return {
        trashed: trashed.length,
        merged: merges.length,
        skipped,
        undo: {
          deletedAt: trashed.length > 0 ? deletedAt.toISOString() : null,
          trashedIds: trashed.map((row) => row.id),
          merges,
        },
      };
    });
    this.logger.log(
      `Clean-up apply: ${result.trashed} trashed, ${result.merged} merged, ${result.skipped} skipped`,
    );
    return result;
  }

  /** The link ids to trash: per group, selected live members of the user, never all of them. */
  private async planTrash(
    tx: Prisma.TransactionClient,
    userId: string,
    findings: StoredCleanupFindings,
    request: CleanupApplyRequest,
  ): Promise<{ ids: string[]; skipped: number }> {
    const groups = new Map(findings.duplicates.map((group) => [group.id, group]));
    const members = [...new Set(findings.duplicates.flatMap((group) => group.linkIds))];
    const live = new Set(
      members.length === 0
        ? []
        : (
            await tx.link.findMany({
              where: { userId, deletedAt: null, id: { in: members } },
              select: { id: true },
            })
          ).map((link) => link.id),
    );
    const ids = new Set<string>();
    let skipped = 0;
    for (const item of request.duplicates) {
      const group = groups.get(item.groupId);
      if (group === undefined) {
        skipped += 1;
        continue;
      }
      const alive = group.linkIds.filter((id) => live.has(id) && !ids.has(id));
      const selected = alive.filter((id) => item.trashIds.includes(id));
      if (selected.length === 0 || selected.length >= alive.length) {
        skipped += 1;
        continue;
      }
      for (const id of selected) ids.add(id);
    }
    return { ids: [...ids], skipped };
  }

  /** One merge of a stored pair into the chosen tag, or `null` when it no longer applies. */
  private async mergeOne(
    tx: Prisma.TransactionClient,
    userId: string,
    findings: StoredCleanupFindings,
    item: CleanupApplyRequest['tagMerges'][number],
  ): Promise<CleanupUndoMerge | null> {
    const pair = findings.similarTags.find((entry) => entry.id === item.pairId);
    if (pair === undefined || !pair.tagIds.includes(item.keepTagId)) return null;
    const sourceId = pair.tagIds[0] === item.keepTagId ? pair.tagIds[1] : pair.tagIds[0];
    const tags = await tx.tag.findMany({
      where: { userId, id: { in: [sourceId, item.keepTagId] } },
      select: { id: true, name: true },
    });
    const source = tags.find((tag) => tag.id === sourceId);
    if (source === undefined || tags.length < 2) return null;
    const result = await this.tags.mergeInTransaction(tx, userId, sourceId, item.keepTagId);
    return {
      keptTagId: item.keepTagId,
      mergedName: source.name,
      linkIds: result.linkIds,
      addedLinkIds: result.addedLinkIds,
    };
  }
}
