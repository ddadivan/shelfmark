import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PIN_ERROR_MESSAGE,
  PIN_KIND,
  PIN_LIMIT,
  type ListPinsResponse,
  type PinRef,
  type PinResponse,
} from '@shelfmark/contracts';
import { FoldersService } from '../folders/folders.service';
import { toFolderResponse } from '../folders/to-folder-response';
import type { Prisma } from '../generated/prisma/client';
import { LINK_INCLUDE } from '../links/models/link-include.const';
import { toLinkResponse } from '../links/to-link-response';
import { PrismaService } from '../prisma/prisma.service';

/** A pinned row reduced to what ordering needs. */
interface PinSlot extends PinRef {
  position: number;
}

/**
 * Sidebar pins (ADR 0037): up to `PIN_LIMIT.Max` live folders and links of one user, ordered by the
 * `pinned_position` column of both tables. Writes run under the `folders:` lock, so the count and the
 * positions cannot be raced. Plain SQL keeps `updated_at`: pinning is not an edit. A row that goes to
 * Trash is unpinned at that moment (the delete paths clear the column), and every read filters
 * `deleted_at IS NULL` as well.
 */
@Injectable()
export class PinsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
  ) {}

  list(userId: string): Promise<ListPinsResponse> {
    return this.load(this.prisma, userId);
  }

  async pin(userId: string, ref: PinRef): Promise<ListPinsResponse> {
    return this.prisma.$transaction(async (tx) => {
      await this.folders.lockTree(tx, userId);
      const current = await this.requireTarget(tx, userId, ref);
      if (current === null) {
        const slots = await this.slots(tx, userId);
        if (slots.length >= PIN_LIMIT.Max)
          throw new ConflictException(PIN_ERROR_MESSAGE.LimitReached);
        const next = slots.reduce((max, slot) => Math.max(max, slot.position), -1) + 1;
        await this.setPosition(tx, userId, ref, next);
      }
      return this.load(tx, userId);
    });
  }

  async unpin(userId: string, ref: PinRef): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.folders.lockTree(tx, userId);
      await this.requireTarget(tx, userId, ref);
      await this.setPosition(tx, userId, ref, null);
    });
  }

  async reorder(userId: string, order: readonly PinRef[]): Promise<ListPinsResponse> {
    return this.prisma.$transaction(async (tx) => {
      await this.folders.lockTree(tx, userId);
      const slots = await this.slots(tx, userId);
      const key = (ref: PinRef): string => `${ref.kind}:${ref.id.toLowerCase()}`;
      const wanted = new Set(order.map(key));
      const same =
        wanted.size === order.length &&
        order.length === slots.length &&
        slots.every((slot) => wanted.has(key(slot)));
      if (!same) throw new BadRequestException(PIN_ERROR_MESSAGE.OrderMismatch);
      for (const [index, ref] of order.entries()) {
        await this.setPosition(tx, userId, { kind: ref.kind, id: ref.id.toLowerCase() }, index);
      }
      return this.load(tx, userId);
    });
  }

  /** 404 unless the target is a live row of the user; returns its current position (`null` = not pinned). */
  private async requireTarget(
    tx: Prisma.TransactionClient,
    userId: string,
    ref: PinRef,
  ): Promise<number | null> {
    const row =
      ref.kind === PIN_KIND.Folder
        ? await tx.folder.findFirst({
            where: { id: ref.id, userId, deletedAt: null },
            select: { pinnedPosition: true },
          })
        : await tx.link.findFirst({
            where: { id: ref.id, userId, deletedAt: null },
            select: { pinnedPosition: true },
          });
    if (!row) throw new NotFoundException(PIN_ERROR_MESSAGE.NotFound);
    return row.pinnedPosition;
  }

  private async setPosition(
    tx: Prisma.TransactionClient,
    userId: string,
    ref: PinRef,
    position: number | null,
  ): Promise<void> {
    if (ref.kind === PIN_KIND.Folder) {
      await tx.$executeRaw`
        UPDATE folders SET pinned_position = ${position}::smallint
        WHERE id = ${ref.id}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NULL`;
    } else {
      await tx.$executeRaw`
        UPDATE links SET pinned_position = ${position}::smallint
        WHERE id = ${ref.id}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NULL`;
    }
  }

  private async slots(tx: Prisma.TransactionClient, userId: string): Promise<PinSlot[]> {
    const [folders, links] = await Promise.all([
      tx.folder.findMany({
        where: { userId, deletedAt: null, pinnedPosition: { not: null } },
        select: { id: true, pinnedPosition: true },
      }),
      tx.link.findMany({
        where: { userId, deletedAt: null, pinnedPosition: { not: null } },
        select: { id: true, pinnedPosition: true },
      }),
    ]);
    return [
      ...folders.map((row) => ({
        kind: PIN_KIND.Folder,
        id: row.id,
        position: row.pinnedPosition ?? 0,
      })),
      ...links.map((row) => ({
        kind: PIN_KIND.Link,
        id: row.id,
        position: row.pinnedPosition ?? 0,
      })),
    ];
  }

  private async load(
    client: Prisma.TransactionClient | PrismaService,
    userId: string,
  ): Promise<ListPinsResponse> {
    const [folders, links] = await Promise.all([
      client.folder.findMany({
        where: { userId, deletedAt: null, pinnedPosition: { not: null } },
      }),
      client.link.findMany({
        where: { userId, deletedAt: null, pinnedPosition: { not: null } },
        include: LINK_INCLUDE,
      }),
    ]);
    const counts = new Map<string, number>();
    if (folders.length > 0) {
      const groups = await client.link.groupBy({
        by: ['folderId'],
        where: { userId, deletedAt: null, folderId: { in: folders.map((row) => row.id) } },
        _count: { _all: true },
        orderBy: { folderId: 'asc' },
      });
      for (const group of groups) {
        if (group.folderId !== null) counts.set(group.folderId, group._count._all);
      }
    }
    const entries = [
      ...folders.map((row) => ({
        kind: PIN_KIND.Folder,
        position: row.pinnedPosition ?? 0,
        id: row.id,
        folder: toFolderResponse(row, counts.get(row.id) ?? 0),
        link: null,
      })),
      ...links.map((row) => ({
        kind: PIN_KIND.Link,
        position: row.pinnedPosition ?? 0,
        id: row.id,
        folder: null,
        link: toLinkResponse(row),
      })),
    ].sort(
      (a, b) => a.position - b.position || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id),
    );
    const items: PinResponse[] = entries.map((entry, index) => ({
      kind: entry.kind,
      position: index,
      folder: entry.folder,
      link: entry.link,
    }));
    return { items };
  }
}
