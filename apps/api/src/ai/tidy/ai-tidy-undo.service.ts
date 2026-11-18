import { Injectable } from '@nestjs/common';
import type { LinkResponse, TidyUndoRequest, TidyUndoResponse } from '@shelfmark/contracts';
import { AiEmbedService } from '../embeddings/ai-embed.service';
import { markEmbeddingsStale } from '../embeddings/mark-embeddings-stale';
import { FoldersService } from '../../folders/folders.service';
import type { Prisma } from '../../generated/prisma/client';
import { LINK_INCLUDE } from '../../links/models/link-include.const';
import { toLinkResponse } from '../../links/to-link-response';
import { PrismaService } from '../../prisma/prisma.service';
import { TagsService } from '../../tags/tags.service';
import { SUGGESTION_ROW_STATE } from '../models/suggestion-row-state.const';

/**
 * Undo of one Tidy run (AI-2, #390) with the `undo` payload of its apply answer. The payload comes
 * from the client, which is safe: every statement is scoped by the session `userId` and conditional
 * on the current state, so only what the run changed and is still there is reverted (a folder the
 * user chose later stays). Tags the run created stay as empty tags, like the bulk tag Undo. Works
 * with AI off. Locks: `folders:` before `tags:`.
 */
@Injectable()
export class AiTidyUndoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
    private readonly tags: TagsService,
    private readonly embed: AiEmbedService,
  ) {}

  async undo(userId: string, request: TidyUndoRequest): Promise<TidyUndoResponse> {
    const response = await this.prisma.$transaction((tx) => this.undoIn(tx, userId, request));
    if (response.links.length > 0) await this.embed.kick(userId);
    return response;
  }

  private async undoIn(
    tx: Prisma.TransactionClient,
    userId: string,
    request: TidyUndoRequest,
  ): Promise<TidyUndoResponse> {
    await this.folders.lockTree(tx, userId);
    await this.tags.lockUserTags(tx, userId);
    const live = await tx.link.findMany({
      where: { userId, deletedAt: null, id: { in: request.items.map((item) => item.linkId) } },
      select: { id: true },
    });
    const liveIds = new Set(live.map((row) => row.id));
    const items = request.items.filter((item) => liveIds.has(item.linkId));
    if (items.length === 0) return { links: [] };
    const now = new Date();

    const byFolder = new Map<string, string[]>();
    for (const item of items) {
      if (item.folderId === null) continue;
      byFolder.set(item.folderId, [...(byFolder.get(item.folderId) ?? []), item.linkId]);
    }
    for (const [folderId, linkIds] of byFolder) {
      // Only while the link is still in the folder the run put it in.
      await tx.link.updateMany({
        where: { userId, deletedAt: null, folderId, id: { in: linkIds } },
        data: { folderId: null, pinnedInFolderAt: null, updatedAt: now },
      });
    }

    const tagged = items.filter((item) => item.tags.length > 0);
    if (tagged.length > 0) {
      const tags = await tx.tag.findMany({ where: { userId }, select: { id: true, name: true } });
      const idOf = new Map(tags.map((tag) => [tag.name.toLowerCase(), tag.id]));
      const pairs = tagged.flatMap((item) => {
        const tagIds = item.tags.flatMap((name) => {
          const id = idOf.get(name.toLowerCase());
          return id === undefined ? [] : [id];
        });
        return tagIds.length === 0 ? [] : [{ linkId: item.linkId, tagId: { in: tagIds } }];
      });
      if (pairs.length > 0) {
        const { count } = await tx.linkTag.deleteMany({ where: { OR: pairs } });
        if (count > 0) {
          await markEmbeddingsStale(tx, userId, { linkIds: tagged.map((item) => item.linkId) });
          await tx.link.updateMany({
            where: { userId, deletedAt: null, id: { in: tagged.map((item) => item.linkId) } },
            data: { updatedAt: now },
          });
        }
      }
    }

    const reopened = items.filter((item) => item.suggestionIds.length > 0);
    if (reopened.length > 0) {
      await tx.linkSuggestion.updateMany({
        where: {
          userId,
          state: SUGGESTION_ROW_STATE.Accepted,
          OR: reopened.map((item) => ({ linkId: item.linkId, id: { in: item.suggestionIds } })),
        },
        data: { state: SUGGESTION_ROW_STATE.Suggested },
      });
    }

    const rows = await tx.link.findMany({
      where: { userId, deletedAt: null, id: { in: items.map((item) => item.linkId) } },
      include: LINK_INCLUDE,
    });
    const byId = new Map(rows.map((row) => [row.id, toLinkResponse(row)]));
    const links = items.flatMap((item): LinkResponse[] => {
      const link = byId.get(item.linkId);
      return link === undefined ? [] : [link];
    });
    return { links };
  }
}
