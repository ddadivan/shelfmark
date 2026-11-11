import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEMO_LIMIT,
  LINK_LIMIT,
  normalizeTagName,
  deriveLinkKind,
  normalizeUrl,
  LINK_ERROR_MESSAGE,
  TAG_ERROR_MESSAGE,
  TAG_LIMIT,
  type CreateLinkRequest,
  type LinkResponse,
  type OpenLinkResponse,
  type UpdateLinkRequest,
} from '@shelfmark/contracts';
import { REQUEST_TIMEOUT_MS } from '../common/interceptors/models/request-timeout.const';
import { FoldersService } from '../folders/folders.service';
import { Prisma } from '../generated/prisma/client';
import { stripControlChars } from '../common/validation/has-control-chars';
import { hasPrismaCode } from '../common/prisma/has-prisma-code';
import { PRISMA_ERROR_CODE } from '../common/prisma/prisma-error-code.const';
import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from '../tags/tags.service';
import { LinkImageCaptureService } from './images/link-image-capture.service';
import { LinkPreviewService } from './link-preview.service';
import type { CaptureSources } from './images/models/capture-sources.interface';
import type { CreateLinkResult } from './models/create-link-result.interface';
import { LINK_INCLUDE } from './models/link-include.const';
import type { LinkDbClient } from './models/link-db-client.type';
import { toLinkResponse } from './to-link-response';

/** Time of the request kept free for the response after a capture. */
const CREATE_RESPONSE_MARGIN_MS = 1_000;

/** `null` and blank text both mean "no note". */
function noteOrNull(note: string | null | undefined): string | null {
  return note === undefined || note === null || note.trim() === '' ? null : note;
}

/** The title when the page gave none: the URL, cut to the title limit. */
function titleOrUrl(title: string, url: string): string {
  const clean = stripControlChars(title).replace(/\s+/g, ' ').trim();
  // By code points: a cut inside a surrogate pair would leave a lone half.
  return [...(clean === '' ? url : clean)].slice(0, LINK_LIMIT.TitleMax).join('');
}

/**
 * Writes of the links API. Locks are always taken in the order `folders:` then `tags:` (ADR 0033);
 * the page fetch of a create runs before the transaction, never inside it.
 */
@Injectable()
export class LinksWriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
    private readonly tags: TagsService,
    private readonly previews: LinkPreviewService,
    private readonly images: LinkImageCaptureService,
  ) {}

  /** `isDemo` comes from the session (never the request): demo sandboxes have a lower link cap. */
  async create(
    userId: string,
    request: CreateLinkRequest,
    isDemo = false,
  ): Promise<CreateLinkResult> {
    const startedAt = Date.now();
    const normalizedUrl = this.normalize(request.url);
    this.assertTagNames(request.tags);
    const key = request.idempotencyKey;
    if (key !== undefined) {
      // Cheap replay check first: a retry must not fetch the page again.
      const replay = await this.findByKey(this.prisma, userId, key);
      if (replay) return { link: replay, created: false };
    }

    let title = request.title;
    // The client's kind (from its preview or the user) wins; else the page fetched below, else the host.
    let kind = request.kind ?? deriveLinkKind(request.url);
    let faviconSourceUrl = request.faviconUrl ?? null;
    let imageSourceUrl = request.imageUrl ?? null;
    if (title === undefined) {
      // Cheap unlocked checks first, so a request that must fail anyway never costs a page fetch
      // (up to 6 s). The locked checks in the transaction stay authoritative.
      await this.precheck(userId, request.folderId, isDemo);
      const { preview, fetched } = await this.previews.load(request.url);
      title = titleOrUrl(preview.title, request.url);
      if (request.kind === undefined) kind = preview.kind;
      if (fetched) {
        faviconSourceUrl ??= preview.faviconUrl;
        imageSourceUrl ??= preview.imageUrl;
      }
    }
    const finalTitle = title;

    let result: CreateLinkResult;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        // Folder lock first: it serializes this insert against folder moves and deletes and makes the
        // per-user count below exact. Tags are locked inside `resolveNames`, after it.
        await this.folders.lockTree(tx, userId);
        if (key !== undefined) {
          const replay = await this.findByKey(tx, userId, key);
          if (replay) return { link: replay, created: false };
        }
        if (request.folderId !== undefined) {
          await this.requireFolder(tx, userId, request.folderId);
        }
        await this.assertUnderLimit(tx, userId, isDemo);
        const tagIds = await this.tags.resolveNames(userId, request.tags ?? [], tx);
        const row = await tx.link.create({
          data: {
            userId,
            folderId: request.folderId ?? null,
            url: request.url,
            normalizedUrl,
            title: finalTitle,
            titleSortKey: finalTitle.toLowerCase(),
            kind,
            note: noteOrNull(request.note),
            faviconSourceUrl,
            imageSourceUrl,
            idempotencyKey: key ?? null,
            tags: { create: tagIds.map((tagId) => ({ tagId })) },
          },
          include: LINK_INCLUDE,
        });
        return { link: toLinkResponse(row), created: true };
      });
    } catch (error) {
      if (key !== undefined && hasPrismaCode(error, PRISMA_ERROR_CODE.UniqueViolation)) {
        // A concurrent request with the same key won: answer with its link.
        const replay = await this.findByKey(this.prisma, userId, key);
        if (replay) return { link: replay, created: false };
      }
      throw this.mapVanished(error);
    }
    // After the commit and outside any transaction: the remote fetches must never hold a lock.
    return this.attachImages(userId, result, { faviconSourceUrl, imageSourceUrl }, startedAt);
  }

  /**
   * Best-effort image capture for a link this request just created (ADR 0027). It gets what is left
   * of the request budget; a failure leaves the link as it is, without images.
   */
  private async attachImages(
    userId: string,
    result: CreateLinkResult,
    sources: CaptureSources,
    startedAt: number,
  ): Promise<CreateLinkResult> {
    if (!result.created || (sources.faviconSourceUrl === null && sources.imageSourceUrl === null)) {
      return result;
    }
    const left = REQUEST_TIMEOUT_MS - CREATE_RESPONSE_MARGIN_MS - (Date.now() - startedAt);
    const stored = await this.images.capture(userId, result.link.id, sources, left);
    if (!stored) return result;
    const row = await this.prisma.link.findFirst({
      where: { id: result.link.id, userId, deletedAt: null },
      include: LINK_INCLUDE,
    });
    return row ? { link: toLinkResponse(row), created: true } : result;
  }

  async update(userId: string, id: string, request: UpdateLinkRequest): Promise<LinkResponse> {
    const data = this.updateData(request);
    this.assertTagNames(request.tags);
    const needsLock = typeof request.folderId === 'string' || request.pinnedInFolder === true;
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (needsLock) await this.folders.lockTree(tx, userId);
        if (typeof request.folderId === 'string') {
          await this.requireFolder(tx, userId, request.folderId);
        }
        const current = await tx.link.findFirst({
          where: { id, userId, deletedAt: null },
          select: { id: true, normalizedUrl: true, folderId: true, pinnedInFolderAt: true },
        });
        if (!current) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
        await this.applyFolderPin(tx, userId, current, request, data);
        // Only a really different page invalidates the captured images and the source hints (the
        // same URL written differently keeps them); the card then falls back to the site letter.
        if (data.normalizedUrl !== undefined && data.normalizedUrl !== current.normalizedUrl) {
          await tx.linkImage.deleteMany({ where: { linkId: id, userId } });
          data.faviconSourceUrl = null;
          data.imageSourceUrl = null;
          // Pending: the first image request for the new page re-captures lazily (ADR 0027 note).
          data.captureAttemptedAt = null;
          // Another page: its kind follows the new host unless the same request sets one (ADR 0038).
          if (request.kind === undefined && request.url !== undefined) {
            data.kind = deriveLinkKind(request.url);
          }
        }

        if (request.tags !== undefined) {
          // Held until commit, so a merge or a concurrent tag write cannot interleave with the swap.
          await this.tags.lockUserTags(tx, userId);
          const tagIds = await this.tags.resolveNames(userId, request.tags, tx);
          await tx.linkTag.deleteMany({ where: { linkId: id } });
          await tx.linkTag.createMany({ data: tagIds.map((tagId) => ({ linkId: id, tagId })) });
        }
        const touched = Object.keys(data).length > 0 || request.tags !== undefined;
        const row = await tx.link.update({
          where: { id, userId, deletedAt: null },
          data: touched ? { ...data, updatedAt: new Date() } : data,
          include: LINK_INCLUDE,
        });
        return toLinkResponse(row);
      });
    } catch (error) {
      throw this.mapVanished(error);
    }
  }

  /** Records an open without touching `updatedAt` (an open is not an edit). */
  async open(userId: string, id: string): Promise<OpenLinkResponse> {
    const touched = await this.prisma.$executeRaw`
      UPDATE links SET last_opened_at = date_trunc('milliseconds', now())
      WHERE id = ${id}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NULL`;
    if (touched === 0) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
    const row = await this.prisma.link.findFirst({
      where: { id, userId, deletedAt: null },
      include: LINK_INCLUDE,
    });
    if (!row) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
    return toLinkResponse(row);
  }

  /** Drops one link from the history (`last_opened_at` to NULL, `updated_at` untouched); idempotent. */
  async removeFromHistory(userId: string, id: string): Promise<void> {
    const touched = await this.prisma.$executeRaw`
      UPDATE links SET last_opened_at = NULL
      WHERE id = ${id}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NULL`;
    if (touched === 0) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
  }

  /**
   * Clears the history of the user: only the own links are touched. Trashed links are cleared too
   * on purpose, so a restored link does not reappear in the history.
   */
  async clearHistory(userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE links SET last_opened_at = NULL
      WHERE user_id = ${userId}::uuid AND last_opened_at IS NOT NULL`;
  }

  /** Moves the link to Trash (ADR 0036): sets `deleted_at`; the row, tags and images stay. */
  async remove(userId: string, id: string): Promise<void> {
    // Plain SQL so `updated_at` stays: moving to Trash is not an edit.
    const deletedAt = new Date();
    const touched = await this.prisma.$executeRaw`
      UPDATE links SET deleted_at = ${deletedAt}, pinned_position = NULL, pinned_in_folder_at = NULL
      WHERE id = ${id}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NULL`;
    if (touched === 0) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
  }

  /**
   * Pin to the top of the folder: pinning needs a folder and room (`PinnedInFolderMax`, counted under
   * the folders lock); a move to another folder unpins; an explicit `false` unpins.
   */
  private async applyFolderPin(
    tx: LinkDbClient,
    userId: string,
    current: { id: string; folderId: string | null; pinnedInFolderAt: Date | null },
    request: UpdateLinkRequest,
    data: Prisma.LinkUncheckedUpdateInput,
  ): Promise<void> {
    const targetFolder = request.folderId === undefined ? current.folderId : request.folderId;
    if (request.pinnedInFolder === true) {
      if (targetFolder === null) throw new BadRequestException(LINK_ERROR_MESSAGE.PinNeedsFolder);
      const moved = targetFolder !== current.folderId;
      if (current.pinnedInFolderAt !== null && !moved) return;
      const count = await tx.link.count({
        where: { userId, deletedAt: null, folderId: targetFolder, pinnedInFolderAt: { not: null } },
      });
      if (count >= LINK_LIMIT.PinnedInFolderMax) {
        throw new ConflictException(LINK_ERROR_MESSAGE.PinnedInFolderLimit);
      }
      data.pinnedInFolderAt = new Date();
    } else if (
      request.pinnedInFolder === false ||
      (request.folderId !== undefined && request.folderId !== current.folderId)
    ) {
      if (current.pinnedInFolderAt !== null) data.pinnedInFolderAt = null;
    }
  }

  /** The columns a PATCH changes; absent fields stay untouched. */
  private updateData(request: UpdateLinkRequest): Prisma.LinkUncheckedUpdateInput {
    const data: Prisma.LinkUncheckedUpdateInput = {};
    if (request.url !== undefined) {
      data.url = request.url;
      data.normalizedUrl = this.normalize(request.url);
    }
    if (request.title !== undefined) {
      data.title = request.title;
      data.titleSortKey = request.title.toLowerCase();
    }
    if (request.note !== undefined) data.note = noteOrNull(request.note);
    if (request.folderId !== undefined) data.folderId = request.folderId;
    if (request.isFavorite !== undefined) data.isFavorite = request.isFavorite;
    if (request.kind !== undefined) data.kind = request.kind;
    return data;
  }

  /** The normalized URL must fit its column; percent-encoding can make it longer than the input. */
  private normalize(url: string): string {
    const normalized = normalizeUrl(url);
    if (normalized.length > LINK_LIMIT.UrlMax) {
      throw new BadRequestException(LINK_ERROR_MESSAGE.UrlTooLong);
    }
    return normalized;
  }

  /** 404 for a foreign or missing folder: they look the same. */
  private requireFolder(tx: LinkDbClient, userId: string, folderId: string): Promise<void> {
    return this.folders.requireOwned(tx, userId, folderId);
  }

  /** Unlocked early rejection for a create that is about to fetch a page. */
  private async precheck(
    userId: string,
    folderId: string | undefined,
    isDemo: boolean,
  ): Promise<void> {
    if (folderId !== undefined) await this.requireFolder(this.prisma, userId, folderId);
    await this.assertUnderLimit(this.prisma, userId, isDemo);
  }

  private async assertUnderLimit(db: LinkDbClient, userId: string, isDemo: boolean): Promise<void> {
    // Demo sandboxes are capped far lower (PROJECT.md 5.8).
    const max = isDemo ? DEMO_LIMIT.MaxLinks : LINK_LIMIT.PerUserMax;
    // Trash counts too (ADR 0036): delete-and-add cannot grow the table past the cap.
    const total = await db.link.count({ where: { userId } });
    if (total >= max) {
      throw new ConflictException(
        isDemo ? LINK_ERROR_MESSAGE.DemoLimitReached : LINK_ERROR_MESSAGE.LimitReached,
      );
    }
  }

  /** Rejects an over-long tag name before any page is fetched or transaction opened. */
  private assertTagNames(names: readonly string[] | undefined): void {
    if (names?.some((name) => normalizeTagName(name).length > TAG_LIMIT.NameMax)) {
      throw new BadRequestException(TAG_ERROR_MESSAGE.NameTooLong);
    }
  }

  /**
   * Deliberately includes trashed links: the unique (user, key) index covers them, so a replay must
   * find the first link (as it is) instead of failing on the index.
   */
  private async findByKey(
    db: LinkDbClient,
    userId: string,
    key: string,
  ): Promise<LinkResponse | null> {
    const row = await db.link.findFirst({
      where: { userId, idempotencyKey: key },
      include: LINK_INCLUDE,
    });
    return row ? toLinkResponse(row) : null;
  }

  /** A row or tag removed by a concurrent request between the lookup and the write. */
  private mapVanished(error: unknown): unknown {
    if (hasPrismaCode(error, PRISMA_ERROR_CODE.RecordNotFound))
      return new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
    if (hasPrismaCode(error, PRISMA_ERROR_CODE.ForeignKeyViolation)) {
      return new ConflictException(LINK_ERROR_MESSAGE.ChangedMeanwhile);
    }
    return error;
  }
}
