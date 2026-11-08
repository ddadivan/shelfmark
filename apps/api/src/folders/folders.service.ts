import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FOLDER_DELETE_MODE,
  FOLDER_LIMIT,
  type CreateFolderRequest,
  type FolderDeleteMode,
  type FolderResponse,
  type ListFoldersResponse,
  type UpdateFolderRequest,
} from '@shelfmark/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { FolderDbClient } from './models/folder-db-client.type';
import { FOLDER_LOCK_PREFIX } from './models/folder-advisory-lock.const';
import { toFolderResponse } from './to-folder-response';
import { wouldCreateCycle } from './would-create-cycle';

const FOREIGN_KEY_VIOLATION = 'P2003';
const NOT_FOUND = 'Folder not found';

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<ListFoldersResponse> {
    // One batch transaction: rows and counts come from the same snapshot.
    const [rows, perFolder, all, unsorted, favorites] = await this.prisma.$transaction([
      this.prisma.folder.findMany({ where: { userId }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
      this.prisma.link.groupBy({
        by: ['folderId'],
        where: { userId, folderId: { not: null } },
        _count: { _all: true },
        orderBy: { folderId: 'asc' },
      }),
      this.prisma.link.count({ where: { userId } }),
      this.prisma.link.count({ where: { userId, folderId: null } }),
      this.prisma.link.count({ where: { userId, isFavorite: true } }),
    ]);
    const counts = new Map(perFolder.map((group) => [group.folderId, group._count._all]));
    return {
      items: rows.map((row) => toFolderResponse(row, counts.get(row.id) ?? 0)),
      counts: { all, unsorted, favorites },
    };
  }

  async get(userId: string, id: string): Promise<FolderResponse> {
    const row = await this.prisma.folder.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return toFolderResponse(row, await this.directLinkCount(this.prisma, userId, id));
  }

  async create(userId: string, request: CreateFolderRequest): Promise<FolderResponse> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockUserTree(tx, userId);
        if (request.parentId !== undefined) await this.requireOwned(tx, userId, request.parentId);
        const total = await tx.folder.count({ where: { userId } });
        if (total >= FOLDER_LIMIT.PerUserMax) {
          throw new ConflictException(`Folder limit reached (${FOLDER_LIMIT.PerUserMax})`);
        }
        const row = await tx.folder.create({
          data: { userId, name: request.name, parentId: request.parentId ?? null },
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
        await this.lockUserTree(tx, userId);
        const current = await tx.folder.findFirst({ where: { id, userId } });
        if (!current) throw new NotFoundException(NOT_FOUND);

        const data: Prisma.FolderUncheckedUpdateInput = {};
        if (request.name !== undefined) data.name = request.name;
        if (request.parentId !== undefined) {
          if (request.parentId !== null) {
            await this.requireOwned(tx, userId, request.parentId);
            const nodes = await tx.folder.findMany({
              where: { userId },
              select: { id: true, parentId: true },
            });
            if (wouldCreateCycle(id, request.parentId, nodes)) {
              throw new BadRequestException('A folder cannot be moved into itself or a subfolder');
            }
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

  async remove(userId: string, id: string, mode: FolderDeleteMode): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.lockUserTree(tx, userId);
      const current = await tx.folder.findFirst({ where: { id, userId }, select: { id: true } });
      if (!current) throw new NotFoundException(NOT_FOUND);

      if (mode === FOLDER_DELETE_MODE.DeleteLinks) {
        const subtree = await tx.$queryRaw<{ id: string }[]>`
          WITH RECURSIVE subtree(id) AS (
            SELECT f.id FROM folders f WHERE f.id = ${id}::uuid AND f.user_id = ${userId}::uuid
            UNION ALL
            SELECT c.id FROM folders c
              JOIN subtree s ON c.parent_id = s.id
            WHERE c.user_id = ${userId}::uuid
          )
          SELECT id::text AS id FROM subtree`;
        await tx.link.deleteMany({
          where: { userId, folderId: { in: subtree.map((row) => row.id) } },
        });
      }
      // move-to-unsorted: subfolders go by cascade, their links by SetNull.
      await tx.folder.deleteMany({ where: { id, userId } });
    });
  }

  /**
   * Serializes tree writes of one user until the transaction ends. Every other writer of a user's
   * folders (import, demo seed, ...) must take this same lock with the same `folders:` key
   * convention (`FOLDER_LOCK_PREFIX` + userId), or the cycle check and the cap can be raced.
   */
  private async lockUserTree(tx: Prisma.TransactionClient, userId: string): Promise<void> {
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
      where: { id: folderId, userId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(NOT_FOUND);
  }

  private directLinkCount(
    client: FolderDbClient,
    userId: string,
    folderId: string,
  ): Promise<number> {
    return client.link.count({ where: { userId, folderId } });
  }

  private mapForeignKey(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === FOREIGN_KEY_VIOLATION
    ) {
      return new NotFoundException(NOT_FOUND);
    }
    return error;
  }
}
