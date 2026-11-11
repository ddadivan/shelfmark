import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FOLDER_DELETE_MODE,
  FOLDER_ERROR_MESSAGE,
  FOLDER_LIMIT,
  type CreateFolderRequest,
  type FolderDeleteMode,
  type FolderResponse,
  type ListFoldersResponse,
  type UpdateFolderRequest,
} from '@shelfmark/contracts';
import { Prisma } from '../generated/prisma/client';
import { hasPrismaCode } from '../common/prisma/has-prisma-code';
import { PRISMA_ERROR_CODE } from '../common/prisma/prisma-error-code.const';
import { PrismaService } from '../prisma/prisma.service';
import type { FolderDbClient } from './models/folder-db-client.type';
import { FOLDER_LOCK_PREFIX } from './models/folder-advisory-lock.const';
import { toFolderResponse } from './to-folder-response';
import { wouldCreateCycle } from './would-create-cycle';

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<ListFoldersResponse> {
    // One batch transaction: rows and counts come from the same snapshot.
    const [rows, perFolder, all, unsorted, favorites] = await this.prisma.$transaction([
      this.prisma.folder.findMany({
        where: { userId, deletedAt: null },
        orderBy: [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.link.groupBy({
        by: ['folderId'],
        where: { userId, deletedAt: null, folderId: { not: null } },
        _count: { _all: true },
        orderBy: { folderId: 'asc' },
      }),
      this.prisma.link.count({ where: { userId, deletedAt: null } }),
      this.prisma.link.count({ where: { userId, deletedAt: null, folderId: null } }),
      this.prisma.link.count({ where: { userId, deletedAt: null, isFavorite: true } }),
    ]);
    const counts = new Map(perFolder.map((group) => [group.folderId, group._count._all]));
    return {
      items: rows.map((row) => toFolderResponse(row, counts.get(row.id) ?? 0)),
      counts: { all, unsorted, favorites },
    };
  }

  async get(userId: string, id: string): Promise<FolderResponse> {
    const row = await this.prisma.folder.findFirst({ where: { id, userId, deletedAt: null } });
    if (!row) throw new NotFoundException(FOLDER_ERROR_MESSAGE.NotFound);
    return toFolderResponse(row, await this.directLinkCount(this.prisma, userId, id));
  }

  async create(userId: string, request: CreateFolderRequest): Promise<FolderResponse> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockTree(tx, userId);
        if (request.parentId !== undefined) await this.requireOwned(tx, userId, request.parentId);
        // Trash counts too (ADR 0036).
        const total = await tx.folder.count({ where: { userId } });
        if (total >= FOLDER_LIMIT.PerUserMax) {
          throw new ConflictException(FOLDER_ERROR_MESSAGE.LimitReached);
        }
        const parentId = request.parentId ?? null;
        const row = await tx.folder.create({
          data: {
            userId,
            name: request.name,
            parentId,
            position: await this.nextPosition(tx, userId, parentId),
          },
        });
        return toFolderResponse(row, 0);
      });
    } catch (error) {
      throw this.mapForeignKey(error);
    }
  }

  async update(userId: string, id: string, request: UpdateFolderRequest): Promise<FolderResponse> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockTree(tx, userId);
        const current = await tx.folder.findFirst({
          where: { id, userId, deletedAt: null },
        });
        if (!current) throw new NotFoundException(FOLDER_ERROR_MESSAGE.NotFound);

        const data: Prisma.FolderUncheckedUpdateInput = {};
        if (request.name !== undefined) data.name = request.name;
        if (request.colour !== undefined) data.colour = request.colour;
        if (request.icon !== undefined) data.icon = request.icon;
        if (request.parentId !== undefined) {
          if (request.parentId !== null) {
            await this.requireOwned(tx, userId, request.parentId);
            const nodes = await tx.folder.findMany({
              where: { userId, deletedAt: null },
              select: { id: true, parentId: true },
            });
            if (wouldCreateCycle(id, request.parentId, nodes)) {
              throw new BadRequestException(FOLDER_ERROR_MESSAGE.MoveIntoDescendant);
            }
          }
          if (request.parentId !== current.parentId) {
            // A move lands at the end of the new parent; the order is never mixed with a move.
            data.position = await this.nextPosition(tx, userId, request.parentId);
          }
          data.parentId = request.parentId;
        }
        const row =
          Object.keys(data).length === 0
            ? current
            : await tx.folder.update({ where: { id_userId: { id, userId } }, data });
        return toFolderResponse(row, await this.directLinkCount(tx, userId, id));
      });
    } catch (error) {
      throw this.mapForeignKey(error);
    }
  }

  /**
   * Sets the manual order of the live subfolders of `parentId` (`null` = top level): `ids` must be
   * exactly those folders (any case), else 400; a foreign, missing or trashed parent is 404. Plain
   * SQL keeps `updated_at`: the order is not an edit of a folder. Answers the whole list afterwards.
   */
  async reorder(
    userId: string,
    parentId: string | null,
    ids: readonly string[],
  ): Promise<ListFoldersResponse> {
    const order = ids.map((id) => id.toLowerCase());
    const parent = parentId?.toLowerCase() ?? null;
    await this.prisma.$transaction(async (tx) => {
      await this.lockTree(tx, userId);
      if (parent !== null) await this.requireOwned(tx, userId, parent);
      const siblings = await tx.folder.findMany({
        where: { userId, parentId: parent, deletedAt: null },
        select: { id: true },
      });
      const wanted = new Set(order);
      const same =
        wanted.size === order.length &&
        order.length === siblings.length &&
        siblings.every((sibling) => wanted.has(sibling.id));
      if (!same) throw new BadRequestException(FOLDER_ERROR_MESSAGE.OrderMismatch);
      for (const [position, id] of order.entries()) {
        await tx.$executeRaw`
          UPDATE folders SET position = ${position}::smallint
          WHERE id = ${id}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NULL`;
      }
    });
    return this.list(userId);
  }

  /**
   * Moves the folder and its live subtree to Trash (ADR 0036): one shared `deleted_at` (captured once)
   * on the folder, every live subfolder and, in `delete-links` mode, every live link inside, so the
   * subtree is one Trash entry. `move-to-unsorted` moves the live links to Unsorted instead. Rows
   * already in Trash (deleted on their own earlier) keep their own timestamp. Plain SQL keeps
   * `updated_at` as it is: moving to Trash is not an edit.
   */
  async remove(userId: string, id: string, mode: FolderDeleteMode): Promise<void> {
    const deletedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await this.lockTree(tx, userId);
      const current = await tx.folder.findFirst({
        where: { id, userId, deletedAt: null },
        select: { id: true },
      });
      if (!current) throw new NotFoundException(FOLDER_ERROR_MESSAGE.NotFound);

      const subtree = await tx.$queryRaw<{ id: string }[]>`
        WITH RECURSIVE subtree(id) AS (
          SELECT f.id FROM folders f
          WHERE f.id = ${id}::uuid AND f.user_id = ${userId}::uuid AND f.deleted_at IS NULL
          UNION ALL
          SELECT c.id FROM folders c
            JOIN subtree s ON c.parent_id = s.id
          WHERE c.user_id = ${userId}::uuid AND c.deleted_at IS NULL
        )
        SELECT id::text AS id FROM subtree`;
      const ids = subtree.map((row) => row.id);
      if (mode === FOLDER_DELETE_MODE.DeleteLinks) {
        await tx.$executeRaw`
          UPDATE links SET deleted_at = ${deletedAt}
          WHERE user_id = ${userId}::uuid AND deleted_at IS NULL
            AND folder_id = ANY(${ids}::uuid[])`;
        // Links that go to Trash leave the sidebar pins and the top of their folder.
        await tx.$executeRaw`
          UPDATE links SET pinned_position = NULL, pinned_in_folder_at = NULL
          WHERE user_id = ${userId}::uuid AND pinned_position IS NOT NULL
            AND folder_id = ANY(${ids}::uuid[])`;
      } else {
        await tx.$executeRaw`
          UPDATE links SET folder_id = NULL, pinned_in_folder_at = NULL
          WHERE user_id = ${userId}::uuid AND deleted_at IS NULL
            AND folder_id = ANY(${ids}::uuid[])`;
      }
      await tx.$executeRaw`
        UPDATE folders SET deleted_at = ${deletedAt}, pinned_position = NULL
        WHERE user_id = ${userId}::uuid AND id = ANY(${ids}::uuid[])`;
    });
  }

  /**
   * Serializes tree writes of one user until the transaction ends. Every other writer of a user's
   * folders (import, demo seed, ...) must take this same lock with the same `folders:` key
   * convention (`FOLDER_LOCK_PREFIX` + userId), or the cycle check and the cap can be raced.
   */
  async lockTree(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${FOLDER_LOCK_PREFIX + userId}, 0))`;
  }

  /**
   * Throws 404 unless the folder exists and belongs to the user (foreign looks like missing).
   * For other modules that reference a folder (links). Callers that create or move links into a
   * folder must also take the `folders:` lock in the same transaction, so a concurrent
   * `delete-links` cannot miss a link inserted after its subtree query.
   */
  async requireOwned(db: FolderDbClient, userId: string, folderId: string): Promise<void> {
    const found = await db.folder.findFirst({
      where: { id: folderId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(FOLDER_ERROR_MESSAGE.NotFound);
  }

  /** The place after the last live subfolder of `parentId` (`null` = top level). */
  private async nextPosition(
    tx: Prisma.TransactionClient,
    userId: string,
    parentId: string | null,
  ): Promise<number> {
    const last = await tx.folder.aggregate({
      where: { userId, parentId, deletedAt: null },
      _max: { position: true },
    });
    return (last._max.position ?? -1) + 1;
  }

  private directLinkCount(
    client: FolderDbClient,
    userId: string,
    folderId: string,
  ): Promise<number> {
    return client.link.count({ where: { userId, folderId, deletedAt: null } });
  }

  private mapForeignKey(error: unknown): unknown {
    if (hasPrismaCode(error, PRISMA_ERROR_CODE.ForeignKeyViolation)) {
      return new NotFoundException(FOLDER_ERROR_MESSAGE.NotFound);
    }
    return error;
  }
}
