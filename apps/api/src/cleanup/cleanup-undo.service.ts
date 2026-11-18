import { Injectable, Logger } from '@nestjs/common';
import {
  CLEANUP_STATE,
  type CleanupUndoRequest,
  type CleanupUndoResponse,
} from '@shelfmark/contracts';
import { markEmbeddingsStale } from '../ai/embeddings/mark-embeddings-stale';
import { FoldersService } from '../folders/folders.service';
import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from '../tags/tags.service';

/**
 * Undo of one clean-up run (ADR 0052 point 5) from the client's payload. Same locks as apply
 * (`folders:` then `tags:`); every statement is on the session user's rows and conditional on the
 * current state, so foreign or missing ids change nothing: links come back from Trash only while
 * their `deleted_at` is still the run's (a link the user restored or trashed again stays as it is;
 * a folder gone meanwhile puts it in Unsorted); each merged tag is re-created by name (or a tag of
 * that name is reused), put back on its own links, and the kept tag is removed from the links that
 * got it only through the merge. Works with AI off.
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
      let restored = 0;
      if (request.deletedAt !== null && request.trashedIds.length > 0) {
        restored = await tx.$executeRaw`
          UPDATE links SET deleted_at = NULL,
            folder_id = CASE
              WHEN folder_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM folders f
                WHERE f.id = links.folder_id AND f.user_id = ${userId}::uuid AND f.deleted_at IS NULL
              ) THEN NULL
              ELSE folder_id END
          WHERE user_id = ${userId}::uuid AND deleted_at = ${new Date(request.deletedAt)}
            AND id = ANY(${request.trashedIds}::uuid[])`;
      }
      let unmerged = 0;
      for (const merge of request.merges) {
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
