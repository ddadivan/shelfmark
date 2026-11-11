import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SHARE_ERROR_MESSAGE,
  SHARE_LIMIT,
  type AuthUser,
  type FolderShareResponse,
  type UpdateFolderShareRequest,
} from '@shelfmark/contracts';
import { hasPrismaCode } from '../common/prisma/has-prisma-code';
import { PRISMA_ERROR_CODE } from '../common/prisma/prisma-error-code.const';
import { FoldersService } from '../folders/folders.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateShareToken } from './generate-share-token';
import type { ShareRow } from './models/share-row.interface';
import { toFolderShareResponse } from './to-folder-share-response';

const SHARE_SELECT = {
  folderId: true,
  token: true,
  showNotes: true,
  tokenCreatedAt: true,
} as const;
/** A token collision (2^-128 per pair) is retried this many times before the request fails. */
const TOKEN_ATTEMPTS = 3;

/**
 * The owner side of public collections (#276): read, enable, change, reset and disable the public
 * link of one of the session user's folders. Every query filters by that user; a foreign or
 * missing folder is the folders 404. Enable and reset take the folder tree lock (`folders:`),
 * so the per-user cap cannot be raced and a folder cannot be deleted mid-way.
 */
@Injectable()
export class FolderSharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
  ) {}

  async get(userId: string, folderId: string): Promise<FolderShareResponse> {
    await this.folders.requireOwned(this.prisma, userId, folderId);
    return toFolderShareResponse(folderId, await this.find(userId, folderId));
  }

  /** Turns the public link on (idempotent: an existing link is returned unchanged). */
  async enable(user: AuthUser, folderId: string): Promise<FolderShareResponse> {
    if (user.isDemo) throw new ForbiddenException(SHARE_ERROR_MESSAGE.DemoUser);
    return this.withTokenRetry(() =>
      this.prisma.$transaction(async (tx) => {
        await this.folders.lockTree(tx, user.id);
        await this.folders.requireOwned(tx, user.id, folderId);
        const existing = await tx.folderShare.findFirst({
          where: { folderId, userId: user.id },
          select: SHARE_SELECT,
        });
        if (existing) return toFolderShareResponse(folderId, existing);
        const total = await tx.folderShare.count({ where: { userId: user.id } });
        if (total >= SHARE_LIMIT.PerUserMax) {
          throw new ConflictException(SHARE_ERROR_MESSAGE.LimitReached);
        }
        const row = await tx.folderShare.create({
          data: { userId: user.id, folderId, token: generateShareToken() },
          select: SHARE_SELECT,
        });
        return toFolderShareResponse(folderId, row);
      }),
    );
  }

  /** Link settings. 404 when the folder is foreign, missing or not shared. */
  async update(
    userId: string,
    folderId: string,
    request: UpdateFolderShareRequest,
  ): Promise<FolderShareResponse> {
    await this.folders.requireOwned(this.prisma, userId, folderId);
    const { count } = await this.prisma.folderShare.updateMany({
      where: { folderId, userId },
      data: { showNotes: request.showNotes },
    });
    if (count === 0) throw new NotFoundException(SHARE_ERROR_MESSAGE.NotFound);
    return toFolderShareResponse(folderId, await this.find(userId, folderId));
  }

  /** A new token; the old link answers 404 from the moment this commits. */
  async reset(userId: string, folderId: string): Promise<FolderShareResponse> {
    await this.folders.requireOwned(this.prisma, userId, folderId);
    return this.withTokenRetry(async () => {
      const { count } = await this.prisma.folderShare.updateMany({
        where: { folderId, userId },
        data: { token: generateShareToken(), tokenCreatedAt: new Date() },
      });
      if (count === 0) throw new NotFoundException(SHARE_ERROR_MESSAGE.NotFound);
      return toFolderShareResponse(folderId, await this.find(userId, folderId));
    });
  }

  /** Turns the public link off (idempotent). The row is deleted, so the token never returns. */
  async disable(userId: string, folderId: string): Promise<void> {
    await this.folders.requireOwned(this.prisma, userId, folderId);
    await this.prisma.folderShare.deleteMany({ where: { folderId, userId } });
  }

  private find(userId: string, folderId: string): Promise<ShareRow | null> {
    return this.prisma.folderShare.findFirst({
      where: { folderId, userId },
      select: SHARE_SELECT,
    });
  }

  /** Runs `write` again when the new token hit the unique index (practically never). */
  private async withTokenRetry<T>(write: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await write();
      } catch (error) {
        if (attempt >= TOKEN_ATTEMPTS || !hasPrismaCode(error, PRISMA_ERROR_CODE.UniqueViolation)) {
          throw error;
        }
      }
    }
  }
}
