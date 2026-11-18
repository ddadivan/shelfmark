import { ConflictException, Injectable, Logger } from '@nestjs/common';
import {
  CLEANUP_ERROR_MESSAGE,
  CLEANUP_STATE,
  type CleanupUndoRequest,
  type CleanupUndoResponse,
} from '@shelfmark/contracts';
import { markEmbeddingsStale } from '../ai/embeddings/mark-embeddings-stale';
import { FoldersService } from '../folders/folders.service';
import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from '../tags/tags.service';
import { readStoredUndo } from './read-stored-undo';

/**
 * Undo of one clean-up run (ADR 0052 point 5) by its run id. What to revert is held on the session
 * user's report row (`undo_data`, written by apply): single-use (cleared here), valid until
 * `undo_until` and only for the latest run, so a replay, an old run id or another user's id is a 409
 * that changes nothing. Lock order as apply: `folders:`, then the report row (`FOR UPDATE`), then
 * `tags:`. Every statement is on the session user's rows and conditional on the current state:
 * links come back from Trash only while their `deleted_at` is still the run's (a link the user
 * restored or trashed again stays as it is; a folder gone meanwhile puts it in Unsorted); each merged
 * tag is re-created by name (or a tag of that name is reused), put back on its own links, and the
 * kept tag is removed from the links that got it only through the merge. Works with AI off.
 */
@Injectable()
export class CleanupUndoService {
  private readonly logger = new Logger(CleanupUndoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
    private readonly tags: TagsService,
  ) {}

  async undo(userId: string, request: CleanupUndoRequest): Promise<CleanupUndoResponse> {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.folders.lockTree(tx, userId);
      const [row] = await tx.$queryRaw<{ undoData: unknown }[]>`
        SELECT undo_data AS "undoData" FROM cleanup_reports
        WHERE user_id = ${userId}::uuid AND undo_run_id = ${request.runId}::uuid
          AND undo_until > now()
        FOR UPDATE`;
      const stored = readStoredUndo(row?.undoData);
      if (stored === null) throw new ConflictException(CLEANUP_ERROR_MESSAGE.UndoGone);
      await tx.$executeRaw`
        UPDATE cleanup_reports SET undo_run_id = NULL, undo_data = NULL, undo_until = NULL
        WHERE user_id = ${userId}::uuid`;
      let restored = 0;
      if (stored.deletedAt !== null && stored.trashedIds.length > 0) {
        restored = await tx.$executeRaw`
          UPDATE links SET deleted_at = NULL,
            folder_id = CASE
              WHEN folder_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM folders f
                WHERE f.id = links.folder_id AND f.user_id = ${userId}::uuid AND f.deleted_at IS NULL
              ) THEN NULL
              ELSE folder_id END
          WHERE user_id = ${userId}::uuid AND deleted_at = ${new Date(stored.deletedAt)}
            AND id = ANY(${stored.trashedIds}::uuid[])`;
      }
      let unmerged = 0;
      for (const merge of stored.merges) {
        const [mergedId] = await this.tags.resolveNames(userId, [merge.mergedName], tx);
        if (mergedId === undefined || mergedId === merge.keptTagId) continue;
        const own = await tx.link.findMany({
          where: { userId, id: { in: merge.linkIds } },
          select: { id: true },
        });
        await tx.linkTag.createMany({
          data: own.map((link) => ({ linkId: link.id, tagId: mergedId })),
          skipDuplicates: true,
        });
        await markEmbeddingsStale(tx, userId, {
          linkIds: [...merge.linkIds, ...merge.addedLinkIds],
        });
        await tx.linkTag.deleteMany({
          where: {
            tagId: merge.keptTagId,
            linkId: { in: merge.addedLinkIds },
            link: { userId },
            tag: { userId },
          },
        });
        unmerged += 1;
      }
      if (restored > 0 || unmerged > 0) {
        await tx.$executeRaw`
          UPDATE cleanup_reports SET state = ${CLEANUP_STATE.Ready}, applied_at = NULL
          WHERE user_id = ${userId}::uuid AND state = ${CLEANUP_STATE.Applied}`;
      }
      return { restored, unmerged };
    });
    this.logger.log(`Clean-up undo: ${result.restored} restored, ${result.unmerged} unmerged`);
    return result;
  }
}
