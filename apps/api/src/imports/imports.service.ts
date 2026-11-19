import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FOLDER_LIMIT,
  IMPORT_ERROR_MESSAGE,
  IMPORT_LIMIT,
  normalizeUrl,
  type FinishImportRequest,
  type ImportCheckResponse,
  type ImportLinksRequest,
  type ImportLinksResponse,
  type ImportSource,
  type ListImportsResponse,
  type StartImportRequest,
  type StartImportResponse,
  type UndoImportResponse,
} from '@shelfmark/contracts';
import type { AiRequestContext } from '../ai/models/ai-request-context.interface';
import { FoldersService } from '../folders/folders.service';
import type { Prisma } from '../generated/prisma/client';
import { LinksBatchService } from '../links/links-batch.service';
import { savedUrl } from '../links/link-save-prefs';
import type { LinksBatchItemInput } from '../links/models/links-batch-item-input.interface';
import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from '../tags/tags.service';
import { assertImportFolderKeys } from './assert-import-folder-keys';
import { clampAddedAt } from './clamp-added-at';
import { isImportOpen, isImportUndoable, undoCutoff } from './import-window';

/**
 * Import of a bookmark file (#387, ADR 0056). The browser parses the file; this service records the
 * import, creates its folders, saves the links in batches through `LinksBatchService` and undoes
 * exactly what the import created through Trash. Every query filters by the session `userId`; a
 * foreign or missing import is a 404. Lock order: `folders:` then `tags:` (ADR 0033).
 */
@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
    private readonly tags: TagsService,
    private readonly batches: LinksBatchService,
  ) {}

  async list(userId: string): Promise<ListImportsResponse> {
    const rows = await this.prisma.import.findMany({
      where: { userId, undoneAt: null, createdAt: { gte: undoCutoff(new Date()) } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: IMPORT_LIMIT.RecentMax,
    });
    const targetIds = rows.flatMap((row) =>
      row.targetFolderId === null ? [] : [row.targetFolderId],
    );
    const live = new Set(
      targetIds.length === 0
        ? []
        : (
            await this.prisma.folder.findMany({
              where: { userId, deletedAt: null, id: { in: targetIds } },
              select: { id: true },
            })
          ).map((folder) => folder.id),
    );
    return {
      items: rows.map((row) => ({
        id: row.id,
        // The CHECK keeps the column to IMPORT_SOURCE.
        source: row.source as ImportSource,
        fileName: row.fileName,
        createdAt: row.createdAt.toISOString(),
        finishedAt: row.finishedAt?.toISOString() ?? null,
        targetFolderId:
          row.targetFolderId !== null && live.has(row.targetFolderId) ? row.targetFolderId : null,
        linksCreated: row.linksCreated,
        foldersCreated: row.foldersCreated,
        skipped: row.skipped,
        failed: row.failed,
      })),
    };
  }

  /** Which of the URLs (by index) are already among the user's live links. Read-only. */
  async check(userId: string, urls: readonly string[]): Promise<ImportCheckResponse> {
    const normalized = urls.map((url) => normalizeUrl(savedUrl(url)));
    const rows = await this.prisma.link.findMany({
      where: { userId, deletedAt: null, normalizedUrl: { in: [...new Set(normalized)] } },
      select: { normalizedUrl: true },
    });
    const known = new Set(rows.map((row) => row.normalizedUrl));
    const saved = normalized.flatMap((url, index) => (known.has(url) ? [index] : []));
    return { saved };
  }

  async start(userId: string, request: StartImportRequest): Promise<StartImportResponse> {
    if (request.targetFolderId !== undefined && request.newFolderName !== undefined) {
      throw new BadRequestException(IMPORT_ERROR_MESSAGE.TargetBoth);
    }
    assertImportFolderKeys(request.folders);
    return this.prisma.$transaction(async (tx) => {
      await this.folders.lockTree(tx, userId);
      if (request.targetFolderId !== undefined) {
        await this.folders.requireOwned(tx, userId, request.targetFolderId);
      }
      // Trash counts too, like FoldersService.create; nothing is written when it does not fit.
      const adding = request.folders.length + (request.newFolderName === undefined ? 0 : 1);
      if (adding > 0) {
        const total = await tx.folder.count({ where: { userId } });
        if (total + adding > FOLDER_LIMIT.PerUserMax) {
          throw new ConflictException(IMPORT_ERROR_MESSAGE.FoldersLimit);
        }
      }
      const record = await tx.import.create({
        data: { userId, source: request.source, fileName: request.fileName },
        select: { id: true },
      });
      const importId = record.id;

      let targetFolderId: string | null = request.targetFolderId?.toLowerCase() ?? null;
      const next = new Map<string | null, number>();
      if (request.newFolderName !== undefined) {
        const created = await tx.folder.create({
          data: {
            userId,
            name: request.newFolderName,
            parentId: null,
            position: await this.nextPosition(tx, userId, null),
            importId,
          },
          select: { id: true },
        });
        targetFolderId = created.id;
        next.set(targetFolderId, 0);
      }
      const ids = new Map<string, string>();
      for (const folder of request.folders) {
        const parentId =
          folder.parentKey === null ? targetFolderId : (ids.get(folder.parentKey) ?? null);
        let position = next.get(parentId);
        if (position === undefined) position = await this.nextPosition(tx, userId, parentId);
        next.set(parentId, position + 1);
        const created = await tx.folder.create({
          data: { userId, name: folder.name, parentId, position, importId },
          select: { id: true },
        });
        ids.set(folder.key, created.id);
      }
      await tx.import.updateMany({
        where: { id: importId, userId },
        data: { foldersCreated: adding, targetFolderId },
      });
      return {
        id: importId,
        targetFolderId,
        folders: request.folders.map((folder) => ({
          key: folder.key,
          id: ids.get(folder.key) ?? '',
        })),
      };
    });
  }

  /** Saves one batch of the import (paste many path, rules off), one transaction. */
  async addLinks(
    userId: string,
    id: string,
    request: ImportLinksRequest,
    isDemo: boolean,
    context: AiRequestContext,
  ): Promise<ImportLinksResponse> {
    const now = new Date();
    const row = await this.requireImport(this.prisma, userId, id);
    if (!isImportOpen(row, now)) throw new ConflictException(IMPORT_ERROR_MESSAGE.Closed);
    // The target counts only while it is a live own folder (else the links go to Unsorted).
    const target =
      row.targetFolderId === null
        ? null
        : await this.prisma.folder.findFirst({
            where: { id: row.targetFolderId, userId, deletedAt: null },
            select: { id: true },
          });
    const items = request.items.map((item): LinksBatchItemInput => ({
      url: savedUrl(item.url),
      idempotencyKey: item.idempotencyKey,
      ...(item.title === undefined ? {} : { title: item.title }),
      ...(item.tags === undefined ? {} : { tags: item.tags }),
      ...(item.note === undefined ? {} : { note: item.note }),
      ...(item.folderId !== undefined
        ? { folderId: item.folderId }
        : target === null
          ? {}
          : { folderId: target.id }),
      ...this.addedAt(item.addedAt, now),
    }));
    const result = await this.batches.create(
      userId,
      { items, applyRules: false },
      isDemo,
      context,
      {
        importId: id,
        skipRepeats: request.skipRepeats !== false,
        // Under the folders lock Undo also takes: no link lands after an Undo.
        afterLock: async (tx) => {
          const current = await this.requireImport(tx, userId, id);
          if (!isImportOpen(current, new Date())) {
            throw new ConflictException(IMPORT_ERROR_MESSAGE.Closed);
          }
        },
      },
    );
    return {
      created: result.createdCount,
      replayed: result.replayedCount,
      errors: result.response.errors,
    };
  }

  async finish(userId: string, id: string, request: FinishImportRequest): Promise<void> {
    const result = await this.prisma.import.updateMany({
      where: { id, userId },
      data: { skipped: request.skipped, failed: request.failed, finishedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException(IMPORT_ERROR_MESSAGE.NotFound);
  }

  /**
   * Moves what the import created to Trash, with one shared `deleted_at` so Trash shows its top
   * folder as one entry. Nothing the import did not create goes to Trash: links the user added to an
   * import folder move to Unsorted, the user's own subfolders move to the top level. Tags the import
   * created go when no other link carries them. Plain SQL keeps `updated_at` (not an edit).
   */
  async undo(userId: string, id: string): Promise<UndoImportResponse> {
    return this.prisma.$transaction(async (tx) => {
      await this.folders.lockTree(tx, userId);
      await this.tags.lockUserTags(tx, userId);
      const row = await this.requireImport(tx, userId, id);
      const now = new Date();
      if (!isImportUndoable(row, now)) throw new ConflictException(IMPORT_ERROR_MESSAGE.UndoGone);

      await tx.$executeRaw`
        UPDATE links SET folder_id = NULL, pinned_in_folder_at = NULL
        WHERE user_id = ${userId}::uuid AND deleted_at IS NULL
          AND (import_id IS NULL OR import_id <> ${id}::uuid)
          AND folder_id IN (
            SELECT f.id FROM folders f
            WHERE f.user_id = ${userId}::uuid AND f.import_id = ${id}::uuid AND f.deleted_at IS NULL)`;
      await tx.$executeRaw`
        UPDATE folders SET parent_id = NULL
        WHERE user_id = ${userId}::uuid AND deleted_at IS NULL
          AND (import_id IS NULL OR import_id <> ${id}::uuid)
          AND parent_id IN (
            SELECT f.id FROM folders f
            WHERE f.user_id = ${userId}::uuid AND f.import_id = ${id}::uuid AND f.deleted_at IS NULL)`;
      const deletedAt = now;
      const links = await tx.$executeRaw`
        UPDATE links SET deleted_at = ${deletedAt}, pinned_position = NULL, pinned_in_folder_at = NULL
        WHERE user_id = ${userId}::uuid AND import_id = ${id}::uuid AND deleted_at IS NULL`;
      const folders = await tx.$executeRaw`
        UPDATE folders SET deleted_at = ${deletedAt}, pinned_position = NULL
        WHERE user_id = ${userId}::uuid AND import_id = ${id}::uuid AND deleted_at IS NULL`;
      // Live or trashed, a link outside this import keeps its tag.
      const tags = await tx.$executeRaw`
        DELETE FROM tags t
        WHERE t.user_id = ${userId}::uuid AND t.import_id = ${id}::uuid
          AND NOT EXISTS (
            SELECT 1 FROM link_tags lt JOIN links l ON l.id = lt.link_id
            WHERE lt.tag_id = t.id AND (l.import_id IS NULL OR l.import_id <> ${id}::uuid))`;
      await tx.import.updateMany({ where: { id, userId }, data: { undoneAt: deletedAt } });
      return { links, folders, tags };
    });
  }

  private addedAt(addedAt: string | undefined, now: Date): { createdAt?: Date } {
    const createdAt = clampAddedAt(addedAt, now);
    return createdAt === undefined ? {} : { createdAt };
  }

  /** The user's own import, else 404 (a foreign id looks like a missing one). */
  private async requireImport(
    db: Prisma.TransactionClient | PrismaService,
    userId: string,
    id: string,
  ) {
    const row = await db.import.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException(IMPORT_ERROR_MESSAGE.NotFound);
    return row;
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
}
