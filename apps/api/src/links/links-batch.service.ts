import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  DEMO_LIMIT,
  LINK_BATCH_ERROR_CODE,
  LINK_ERROR_MESSAGE,
  LINK_LIMIT,
  linkLimitMessage,
  normalizeTagName,
  normalizeUrl,
  TAG_ERROR_MESSAGE,
  TAG_LIMIT,
  type CreateLinksBatchRequest,
  type LinkBatchItemError,
  type LinkResponse,
  deriveLinkKind,
} from '@shelfmark/contracts';
import { hasPrismaCode } from '../common/prisma/has-prisma-code';
import { PRISMA_ERROR_CODE } from '../common/prisma/prisma-error-code.const';
import { FoldersService } from '../folders/folders.service';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from '../tags/tags.service';
import type { CreateLinksBatchResult } from './models/create-links-batch-result.interface';
import { LINK_INCLUDE } from './models/link-include.const';
import type { LinkDbClient } from './models/link-db-client.type';
import type { PlannedBatchItem } from './models/planned-batch-item.interface';
import { fallbackTitle } from './title-or-url';
import { toLinkResponse } from './to-link-response';

/**
 * Several links at once (paste many, #265). One transaction under the lock order of ADR 0033
 * (`folders:` then `tags:`), per-item idempotency keys, the per-user cap checked for the whole
 * batch. It never fetches anything: the links are stored with their image capture pending
 * (`capture_attempted_at` NULL), so the lazy capture of ADR 0027 (`POST /links/:id/images/capture`,
 * the same SSRF-safe path and rate limit as before) loads the images, and the page title of links
 * saved without one, after the response.
 */
@Injectable()
export class LinksBatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
    private readonly tags: TagsService,
  ) {}

  /** `isDemo` comes from the session (never the request): demo sandboxes have a lower link cap. */
  async create(
    userId: string,
    request: CreateLinksBatchRequest,
    isDemo = false,
  ): Promise<CreateLinksBatchResult> {
    this.assertTagNames(request.tags);
    this.assertDistinctKeys(request);
    const { planned, errors } = this.plan(request);
    if (planned.length === 0) {
      return { response: { links: [], errors }, created: false };
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Folder lock first: it serializes the inserts against folder moves and deletes, makes the
        // count below exact and makes two retries of the same batch wait for each other.
        await this.folders.lockTree(tx, userId);
        const replayed = await this.findByKeys(tx, userId, planned);
        const fresh = planned.filter((entry) => !replayed.has(entry.item.idempotencyKey));
        let created = new Map<string, LinkResponse>();
        if (fresh.length > 0) {
          if (request.folderId !== undefined) {
            await this.folders.requireOwned(tx, userId, request.folderId);
          }
          await this.assertFits(tx, userId, fresh.length, isDemo);
          const tagIds = await this.tags.resolveNames(userId, request.tags ?? [], tx);
          created = await this.insert(tx, userId, fresh, request.folderId ?? null, tagIds);
        }
        const links = planned.flatMap((entry) => {
          const key = entry.item.idempotencyKey;
          const link = replayed.get(key) ?? created.get(key);
          return link ? [link] : [];
        });
        return { response: { links, errors }, created: fresh.length > 0 };
      });
    } catch (error) {
      if (hasPrismaCode(error, PRISMA_ERROR_CODE.UniqueViolation)) {
        // Only reachable if the lock is ever bypassed: a concurrent batch with the same keys won.
        const replayed = await this.findByKeys(this.prisma, userId, planned);
        if (replayed.size === planned.length) {
          const links = planned.flatMap((entry) => {
            const link = replayed.get(entry.item.idempotencyKey);
            return link ? [link] : [];
          });
          return { response: { links, errors }, created: false };
        }
      }
      if (
        hasPrismaCode(error, PRISMA_ERROR_CODE.ForeignKeyViolation) ||
        hasPrismaCode(error, PRISMA_ERROR_CODE.UniqueViolation)
      ) {
        throw new ConflictException(LINK_ERROR_MESSAGE.ChangedMeanwhile);
      }
      throw error;
    }
  }

  /** Deletes the user's links among `ids` (Undo of a batch); foreign and missing ids count as nothing. */
  async remove(userId: string, ids: readonly string[]): Promise<number> {
    const result = await this.prisma.link.deleteMany({ where: { userId, id: { in: [...ids] } } });
    return result.count;
  }

  /**
   * Splits the items into those to save and those to skip: a normalized URL over the column limit,
   * or the same normalized URL as an earlier item of the batch.
   */
  private plan(request: CreateLinksBatchRequest): {
    planned: PlannedBatchItem[];
    errors: LinkBatchItemError[];
  } {
    const planned: PlannedBatchItem[] = [];
    const errors: LinkBatchItemError[] = [];
    const seen = new Set<string>();
    request.items.forEach((item, index) => {
      const normalizedUrl = normalizeUrl(item.url);
      if (normalizedUrl.length > LINK_LIMIT.UrlMax) {
        errors.push({ index, url: item.url, code: LINK_BATCH_ERROR_CODE.UrlTooLong });
      } else if (seen.has(normalizedUrl)) {
        errors.push({ index, url: item.url, code: LINK_BATCH_ERROR_CODE.DuplicateInBatch });
      } else {
        seen.add(normalizedUrl);
        planned.push({ index, item, normalizedUrl });
      }
    });
    return { planned, errors };
  }

  /**
   * Inserts the new links. The first item of the paste gets the latest `createdAt`, so the newest
   * first feed shows the links in the order they were pasted. The capture is pending for every one.
   */
  private async insert(
    tx: Prisma.TransactionClient,
    userId: string,
    fresh: readonly PlannedBatchItem[],
    folderId: string | null,
    tagIds: readonly string[],
  ): Promise<Map<string, LinkResponse>> {
    const now = Date.now();
    const rows = await tx.link.createManyAndReturn({
      data: fresh.map((entry, position) => {
        const { item } = entry;
        const title = item.title ?? fallbackTitle(item.url);
        return {
          userId,
          folderId,
          url: item.url,
          normalizedUrl: entry.normalizedUrl,
          title,
          titleSortKey: title.toLowerCase(),
          // Like a single save: the type comes from known hosts (no page is fetched here).
          kind: deriveLinkKind(item.url),
          faviconSourceUrl: item.faviconUrl ?? null,
          imageSourceUrl: item.imageUrl ?? null,
          captureAttemptedAt: null,
          idempotencyKey: item.idempotencyKey,
          createdAt: new Date(now - position),
          updatedAt: new Date(now - position),
        };
      }),
      select: { id: true },
    });
    const ids = rows.map((row) => row.id);
    if (tagIds.length > 0) {
      await tx.linkTag.createMany({
        data: ids.flatMap((linkId) => tagIds.map((tagId) => ({ linkId, tagId }))),
      });
    }
    const saved = await tx.link.findMany({
      where: { userId, id: { in: ids } },
      include: LINK_INCLUDE,
    });
    return new Map(
      saved.flatMap((row) =>
        row.idempotencyKey === null ? [] : [[row.idempotencyKey, toLinkResponse(row)] as const],
      ),
    );
  }

  private async findByKeys(
    db: LinkDbClient,
    userId: string,
    planned: readonly PlannedBatchItem[],
  ): Promise<Map<string, LinkResponse>> {
    const rows = await db.link.findMany({
      where: { userId, idempotencyKey: { in: planned.map((entry) => entry.item.idempotencyKey) } },
      include: LINK_INCLUDE,
    });
    return new Map(
      rows.flatMap((row) =>
        row.idempotencyKey === null ? [] : [[row.idempotencyKey, toLinkResponse(row)] as const],
      ),
    );
  }

  /** 409 when the new links do not fit the cap; the message says how many still fit. */
  private async assertFits(
    db: LinkDbClient,
    userId: string,
    adding: number,
    isDemo: boolean,
  ): Promise<void> {
    const max = isDemo ? DEMO_LIMIT.MaxLinks : LINK_LIMIT.PerUserMax;
    const total = await db.link.count({ where: { userId } });
    if (total + adding > max) {
      throw new ConflictException(linkLimitMessage(max - total));
    }
  }

  /** Two items with one key would replay each other: the client must send one key per link. */
  private assertDistinctKeys(request: CreateLinksBatchRequest): void {
    const keys = request.items.map((item) => item.idempotencyKey.toLowerCase());
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException(LINK_ERROR_MESSAGE.DuplicateIdempotencyKey);
    }
  }

  /** Rejects an over-long tag name before the transaction opens. */
  private assertTagNames(names: readonly string[] | undefined): void {
    if (names?.some((name) => normalizeTagName(name).length > TAG_LIMIT.NameMax)) {
      throw new BadRequestException(TAG_ERROR_MESSAGE.NameTooLong);
    }
  }
}
