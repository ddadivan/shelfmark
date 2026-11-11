import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  LINK_ERROR_MESSAGE,
  LINK_LIMIT,
  LINKS_BATCH_ERROR_MESSAGE,
  normalizeTagName,
  TAG_ERROR_MESSAGE,
  TAG_LIMIT,
  type LinkResponse,
  type UpdateLinksBatchRequest,
  type UpdateLinksBatchResponse,
} from '@shelfmark/contracts';
import { hasPrismaCode } from '../common/prisma/has-prisma-code';
import { PRISMA_ERROR_CODE } from '../common/prisma/prisma-error-code.const';
import { escapeLike } from '../common/util/escape-like';
import { FoldersService } from '../folders/folders.service';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from '../tags/tags.service';
import { LINK_INCLUDE } from './models/link-include.const';
import type { LinkDbClient } from './models/link-db-client.type';
import { toLinkResponse } from './to-link-response';

/** Normalised, non-empty tag names, de-duplicated case-insensitively (the first spelling wins). */
function tagNames(raw: readonly string[] | undefined): string[] {
  const names = new Map<string, string>();
  for (const value of raw ?? []) {
    const name = normalizeTagName(value);
    if (name === '') continue;
    if (name.length > TAG_LIMIT.NameMax) {
      throw new BadRequestException(TAG_ERROR_MESSAGE.NameTooLong);
    }
    const key = name.toLowerCase();
    if (!names.has(key)) names.set(key, name);
  }
  return [...names.values()];
}

/**
 * Writes on several selected links at once (bulk actions, #267): move to Trash and one change
 * (move, tags, favorite) for up to `LINK_LIMIT.BatchMax` links. Every statement is scoped to the
 * session user and to live links; foreign, missing and trashed ids are ignored, so the answer never
 * tells whether an id exists for someone else. Locks follow ADR 0033: `folders:` before `tags:`.
 */
@Injectable()
export class LinksBulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
    private readonly tags: TagsService,
  ) {}

  /**
   * Moves the user's live links among `ids` to Trash (ADR 0036) with one shared `deleted_at`;
   * each link stays its own Trash entry (its folder is live). Pins are cleared like a single
   * delete. Plain SQL so `updated_at` stays: moving to Trash is not an edit.
   */
  async remove(userId: string, ids: readonly string[]): Promise<number> {
    const deletedAt = new Date();
    return this.prisma.$executeRaw`
      UPDATE links SET deleted_at = ${deletedAt}, pinned_position = NULL, pinned_in_folder_at = NULL
      WHERE user_id = ${userId}::uuid AND deleted_at IS NULL AND id = ANY(${[...ids]}::uuid[])`;
  }

  /** Applies the requested changes to the user's live links among `ids`, all or nothing. */
  async update(
    userId: string,
    request: UpdateLinksBatchRequest,
  ): Promise<UpdateLinksBatchResponse> {
    const { folderId, isFavorite } = request;
    if (
      folderId === undefined &&
      isFavorite === undefined &&
      request.addTags === undefined &&
      request.removeTags === undefined
    ) {
      throw new BadRequestException(LINKS_BATCH_ERROR_MESSAGE.NothingToChange);
    }
    const add = tagNames(request.addTags);
    const remove = tagNames(request.removeTags);
    const removeKeys = new Set(remove.map((name) => name.toLowerCase()));
    if (add.some((name) => removeKeys.has(name.toLowerCase()))) {
      throw new BadRequestException(LINKS_BATCH_ERROR_MESSAGE.TagAddedAndRemoved);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Folder lock first (ADR 0033): a move must not race a folder delete or move, and the
        // folder must still be the user's and live when the links land in it.
        if (folderId !== undefined) {
          await this.folders.lockTree(tx, userId);
          if (folderId !== null) await this.folders.requireOwned(tx, userId, folderId);
        }
        const rows = await tx.link.findMany({
          where: { userId, deletedAt: null, id: { in: [...request.ids] } },
          select: { id: true, folderId: true, pinnedInFolderAt: true },
        });
        if (rows.length === 0) return { updated: 0, links: [] };
        const linkIds = rows.map((row) => row.id);

        if (add.length > 0 || remove.length > 0) {
          // Held until commit, so a merge or a concurrent tag write cannot interleave.
          await this.tags.lockUserTags(tx, userId);
          if (remove.length > 0) await this.removeTags(tx, userId, linkIds, remove);
          if (add.length > 0) await this.addTags(tx, userId, linkIds, add);
        }

        const data: Prisma.LinkUncheckedUpdateManyInput = { updatedAt: new Date() };
        if (isFavorite !== undefined) data.isFavorite = isFavorite;
        if (folderId !== undefined) {
          data.folderId = folderId;
          // A move to another folder unpins from the top of the old one (like a single move).
          const unpin = rows
            .filter((row) => row.pinnedInFolderAt !== null && row.folderId !== folderId)
            .map((row) => row.id);
          if (unpin.length > 0) {
            await tx.link.updateMany({
              where: { userId, id: { in: unpin } },
              data: { pinnedInFolderAt: null },
            });
          }
        }
        await tx.link.updateMany({ where: { userId, deletedAt: null, id: { in: linkIds } }, data });

        const updated = await tx.link.findMany({
          where: { userId, deletedAt: null, id: { in: linkIds } },
          include: LINK_INCLUDE,
        });
        const byId = new Map(updated.map((row) => [row.id, toLinkResponse(row)]));
        const links = request.ids
          .map((id) => byId.get(id))
          .filter((link): link is LinkResponse => link !== undefined);
        return { updated: links.length, links };
      });
    } catch (error) {
      if (hasPrismaCode(error, PRISMA_ERROR_CODE.ForeignKeyViolation)) {
        throw new ConflictException(LINK_ERROR_MESSAGE.ChangedMeanwhile);
      }
      throw error;
    }
  }

  /** Takes the named tags off the links; unknown names match nothing, the tags themselves stay. */
  private async removeTags(
    tx: LinkDbClient,
    userId: string,
    linkIds: readonly string[],
    names: readonly string[],
  ): Promise<void> {
    // Matched in the database like the unique index (`ILIKE`, so every name is escaped).
    const found = await tx.tag.findMany({
      where: {
        userId,
        OR: names.map((name) => ({ name: { equals: escapeLike(name), mode: 'insensitive' } })),
      },
      select: { id: true },
    });
    if (found.length === 0) return;
    await tx.linkTag.deleteMany({
      where: { linkId: { in: [...linkIds] }, tagId: { in: found.map((tag) => tag.id) } },
    });
  }

  /** Finds or creates the tags and adds them where missing; a link past `TagsMax` fails it all. */
  private async addTags(
    tx: Prisma.TransactionClient,
    userId: string,
    linkIds: readonly string[],
    names: readonly string[],
  ): Promise<void> {
    const tagIds = await this.tags.resolveNames(userId, names, tx);
    const existing = await tx.linkTag.findMany({
      where: { linkId: { in: [...linkIds] } },
      select: { linkId: true, tagId: true },
    });
    const byLink = new Map<string, Set<string>>(linkIds.map((id) => [id, new Set<string>()]));
    for (const pair of existing) byLink.get(pair.linkId)?.add(pair.tagId);
    const missing: { linkId: string; tagId: string }[] = [];
    for (const [linkId, current] of byLink) {
      const fresh = tagIds.filter((tagId) => !current.has(tagId));
      if (current.size + fresh.length > LINK_LIMIT.TagsMax) {
        throw new ConflictException(LINKS_BATCH_ERROR_MESSAGE.TooManyTags);
      }
      for (const tagId of fresh) missing.push({ linkId, tagId });
    }
    if (missing.length > 0) await tx.linkTag.createMany({ data: missing, skipDuplicates: true });
  }
}
