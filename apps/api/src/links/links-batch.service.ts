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
  type LinkBatchItemError,
  type LinkResponse,
  deriveLinkKind,
} from '@shelfmark/contracts';
import { AiEmbedService } from '../ai/embeddings/ai-embed.service';
import { AiJobsService } from '../ai/jobs/ai-jobs.service';
import type { LockedDraft } from '../ai/models/locked-draft.interface';
import type { AiRequestContext } from '../ai/models/ai-request-context.interface';
import { hasPrismaCode } from '../common/prisma/has-prisma-code';
import { PRISMA_ERROR_CODE } from '../common/prisma/prisma-error-code.const';
import { FoldersService } from '../folders/folders.service';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RulesService } from '../rules/rules.service';
import { TagsService } from '../tags/tags.service';
import type { CreateLinksBatchResult } from './models/create-links-batch-result.interface';
import { LINK_INCLUDE } from './models/link-include.const';
import type { LinkDbClient } from './models/link-db-client.type';
import type { BatchInsertResult } from './models/batch-insert-result.interface';
import type { BatchTarget } from './models/batch-target.interface';
import type { LinksBatchInput } from './models/links-batch-input.interface';
import type { LinksBatchOptions } from './models/links-batch-options.interface';
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
    private readonly rules: RulesService,
    private readonly aiJobs: AiJobsService,
    private readonly aiEmbed: AiEmbedService,
  ) {}

  /**
   * `isDemo` comes from the session (never the request): demo sandboxes have a lower link cap.
   * Every created link gets an AI job while AI is on (started after the commit).
   */
  async create(
    userId: string,
    request: LinksBatchInput,
    isDemo = false,
    context: AiRequestContext = {},
    options: LinksBatchOptions = {},
  ): Promise<CreateLinksBatchResult> {
    this.assertTagNames([
      ...(request.tags ?? []),
      ...request.items.flatMap((item) => item.tags ?? []),
    ]);
    this.assertDistinctKeys(request);
    const { planned, errors } = this.plan(request, options.skipRepeats !== false);
    if (planned.length === 0) {
      return {
        response: { links: [], errors },
        created: false,
        createdCount: 0,
        replayedCount: 0,
      };
    }
    let aiJobIds: string[] = [];
    try {
      const outcome = await this.prisma.$transaction(async (tx) => {
        // Folder lock first: it serializes the inserts against folder moves and deletes, makes the
        // count below exact and makes two retries of the same batch wait for each other.
        await this.folders.lockTree(tx, userId);
        await options.afterLock?.(tx);
        const replayed = await this.findByKeys(tx, userId, planned);
        const fresh = planned.filter((entry) => !replayed.has(entry.item.idempotencyKey));
        let created = new Map<string, LinkResponse>();
        if (fresh.length > 0) {
          // The batch folder and every item folder must be live folders of the user.
          const folderIds = new Set(
            [request.folderId, ...fresh.map((entry) => entry.item.folderId)].filter(
              (id): id is string => id !== undefined,
            ),
          );
          for (const folderId of folderIds) {
            await this.folders.requireOwned(tx, userId, folderId);
          }
          await this.assertFits(tx, userId, fresh.length, isDemo);
          // Draft job rows are locked after `folders:` and before `tags:` (ADR 0049 point 4).
          const drafts =
            options.skipAi === true ? new Map() : await this.lockDrafts(tx, userId, fresh);
          const inserted = await this.insert(
            tx,
            userId,
            await this.targets(tx, userId, request, fresh, options.importId),
            context,
            options.importId,
            options.skipAi === true,
            drafts,
          );
          created = inserted.links;
          aiJobIds = inserted.aiJobIds;
          if (options.importId !== undefined) {
            await tx.import.updateMany({
              where: { id: options.importId, userId },
              data: { linksCreated: { increment: fresh.length } },
            });
          }
        }
        const links = planned.flatMap((entry) => {
          const key = entry.item.idempotencyKey;
          const link = replayed.get(key) ?? created.get(key);
          return link ? [link] : [];
        });
        return {
          response: { links, errors },
          created: fresh.length > 0,
          createdCount: fresh.length,
          replayedCount: planned.length - fresh.length,
        };
      });
      this.aiJobs.start(userId, aiJobIds);
      // Search by meaning: links without a job are embedded now, the others after their jobs.
      if (outcome.created && aiJobIds.length === 0) await this.aiEmbed.kick(userId);
      return outcome;
    } catch (error) {
      if (hasPrismaCode(error, PRISMA_ERROR_CODE.UniqueViolation)) {
        // Only reachable if the lock is ever bypassed: a concurrent batch with the same keys won.
        const replayed = await this.findByKeys(this.prisma, userId, planned);
        if (replayed.size === planned.length) {
          const links = planned.flatMap((entry) => {
            const link = replayed.get(entry.item.idempotencyKey);
            return link ? [link] : [];
          });
          return {
            response: { links, errors },
            created: false,
            createdCount: 0,
            replayedCount: planned.length,
          };
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

  /**
   * Splits the items into those to save and those to skip: a normalized URL over the column limit,
   * or (unless `skipRepeats` is off) the same normalized URL as an earlier item of the batch.
   */
  private plan(
    request: LinksBatchInput,
    skipRepeats: boolean,
  ): {
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
      } else if (skipRepeats && seen.has(normalizedUrl)) {
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
    fresh: readonly BatchTarget[],
    context: AiRequestContext,
    importId?: string,
    skipAi = false,
    drafts: ReadonlyMap<string, LockedDraft> = new Map(),
  ): Promise<BatchInsertResult> {
    const now = Date.now();
    const rows = await tx.link.createManyAndReturn({
      data: fresh.map(({ entry, folderId }, position) => {
        const { item } = entry;
        const title = item.title ?? fallbackTitle(item.url);
        const createdAt = item.createdAt ?? new Date(now - position);
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
          note: item.note ?? null,
          importId: importId ?? null,
          createdAt,
          updatedAt: createdAt,
        };
      }),
      select: { id: true, idempotencyKey: true },
    });
    const ids = rows.map((row) => row.id);
    const tagIdsByKey = new Map(
      fresh.map((target) => [target.entry.item.idempotencyKey.toLowerCase(), target.tagIds]),
    );
    const pairs = rows.flatMap((row) =>
      (row.idempotencyKey === null
        ? []
        : (tagIdsByKey.get(row.idempotencyKey.toLowerCase()) ?? [])
      ).map((tagId) => ({ linkId: row.id, tagId })),
    );
    if (pairs.length > 0) await tx.linkTag.createMany({ data: pairs });
    // AI (ADR 0049): one job per new link whose parts are open; nothing while AI is off.
    const filledById = new Map(
      rows.map((row) => {
        const target = fresh.find(
          (entry) =>
            entry.entry.item.idempotencyKey.toLowerCase() === row.idempotencyKey?.toLowerCase(),
        );
        return [row.id, target] as const;
      }),
    );
    const targetOf = (row: { id: string }) => {
      const target = filledById.get(row.id);
      return {
        linkId: row.id,
        folderSet: (target?.folderId ?? null) !== null,
        tagsSet: (target?.tagIds.length ?? 0) > 0,
      };
    };
    const draftOf = (row: { id: string; idempotencyKey: string | null }) =>
      row.idempotencyKey === null ? undefined : drafts.get(row.idempotencyKey.toLowerCase());
    const aiJobIds: string[] = [];
    if (!skipAi) {
      // An item with a draft picks it up like a single save; the others get a job each.
      const open = rows.filter((row) => draftOf(row) === undefined);
      for (const row of rows) {
        const draft = draftOf(row);
        if (draft === undefined) continue;
        const attached = await this.aiJobs.afterCreate(tx, userId, targetOf(row), draft, context);
        aiJobIds.push(...attached.jobIds);
      }
      const ai = await this.aiJobs.enqueue(tx, userId, open.map(targetOf), context);
      aiJobIds.push(...ai.jobIds);
    }
    const saved = await tx.link.findMany({
      where: { userId, id: { in: ids } },
      include: LINK_INCLUDE,
    });
    const links = new Map(
      saved.flatMap((row) =>
        row.idempotencyKey === null ? [] : [[row.idempotencyKey, toLinkResponse(row)] as const],
      ),
    );
    return { links, aiJobIds };
  }

  /**
   * Locks the user's unattached draft job of every `aiDraftId` of the items to create, by id (a
   * fixed order, so two batches never wait on each other in a circle). Keyed by the item's
   * idempotency key (lower case). An id nobody owns (unknown or another user's: the query filters
   * by `userId`, so it never reveals which) or one already used by an earlier item of the batch
   * gives its item no draft: it gets a normal AI job, as a single save does for an unknown draft.
   */
  private async lockDrafts(
    tx: Prisma.TransactionClient,
    userId: string,
    fresh: readonly PlannedBatchItem[],
  ): Promise<Map<string, LockedDraft>> {
    const owners = new Map<string, string>();
    for (const { item } of fresh) {
      const id = item.aiDraftId?.toLowerCase();
      if (id !== undefined && !owners.has(id)) owners.set(id, item.idempotencyKey.toLowerCase());
    }
    const drafts = new Map<string, LockedDraft>();
    for (const id of [...owners.keys()].sort()) {
      const draft = await this.aiJobs.lockDraft(tx, userId, id);
      const key = owners.get(id);
      if (draft !== null && key !== undefined) drafts.set(key, draft);
    }
    return drafts;
  }

  /**
   * Folder and tags of each new link: the item's own, else the batch's, else the domain rule of
   * the link (#398, unless `applyRules` is false or the batch is an import's). Tag lists are
   * resolved once per distinct list (the tags lock is taken there, after the folders lock); with an
   * `importId` the tags this batch creates get it.
   */
  private async targets(
    tx: Prisma.TransactionClient,
    userId: string,
    request: LinksBatchInput,
    fresh: readonly PlannedBatchItem[],
    importId?: string,
  ): Promise<BatchTarget[]> {
    const rulesOff = request.applyRules === false || importId !== undefined;
    const match = rulesOff ? () => null : await this.rules.matcher(tx, userId);
    // Tags that exist before this batch (read under the tags lock): the others are this batch's.
    let before: Set<string> | undefined;
    if (importId !== undefined && fresh.some((entry) => (entry.item.tags?.length ?? 0) > 0)) {
      await this.tags.lockUserTags(tx, userId);
      const rows = await tx.tag.findMany({ where: { userId }, select: { id: true } });
      before = new Set(rows.map((row) => row.id));
    }
    const resolved = new Map<string, string[]>();
    const targets: BatchTarget[] = [];
    for (const entry of fresh) {
      const { item } = entry;
      const rule = match(item.url);
      const names = item.tags ?? (request.tags?.length ? request.tags : (rule?.tags ?? []));
      const key = JSON.stringify(names);
      let tagIds = resolved.get(key);
      if (tagIds === undefined) {
        tagIds = await this.tags.resolveNames(userId, names, tx);
        resolved.set(key, tagIds);
      }
      targets.push({
        entry,
        folderId: item.folderId ?? request.folderId ?? rule?.folderId ?? null,
        tagIds,
      });
    }
    if (importId !== undefined && before !== undefined) {
      const known = before;
      const created = [...new Set(targets.flatMap((target) => target.tagIds))].filter(
        (id) => !known.has(id),
      );
      if (created.length > 0) {
        await tx.tag.updateMany({ where: { userId, id: { in: created } }, data: { importId } });
      }
    }
    return targets;
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
  private assertDistinctKeys(request: LinksBatchInput): void {
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
