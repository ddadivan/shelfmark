import { ConflictException, Injectable } from '@nestjs/common';
import {
  AI_ERROR_MESSAGE,
  LINK_ERROR_MESSAGE,
  LINK_LIMIT,
  normalizeTagName,
  SUGGESTION_KIND,
  TIDY_LIMIT,
  type LinkResponse,
  type TidyApplyRequest,
  type TidyApplyResponse,
  type TidyCountResponse,
  type TidyItem,
  type TidyListResponse,
  type TidyUndoItem,
} from '@shelfmark/contracts';
import { AiEmbedService } from '../embeddings/ai-embed.service';
import { markEmbeddingsStale } from '../embeddings/mark-embeddings-stale';
import { hasPrismaCode } from '../../common/prisma/has-prisma-code';
import { PRISMA_ERROR_CODE } from '../../common/prisma/prisma-error-code.const';
import { FoldersService } from '../../folders/folders.service';
import type { Prisma } from '../../generated/prisma/client';
import { LINK_INCLUDE } from '../../links/models/link-include.const';
import { toLinkResponse } from '../../links/to-link-response';
import { PrismaService } from '../../prisma/prisma.service';
import { RulesService } from '../../rules/rules.service';
import { TagsService } from '../../tags/tags.service';
import type { AiDbClient } from '../models/ai-db-client.type';
import { SUGGESTION_ROW_STATE } from '../models/suggestion-row-state.const';
import type { TidyFilterContext } from '../models/tidy-filter-context.interface';
import type { TidyLinkPlan } from '../models/tidy-link-plan.interface';
import type { TidyLinkRow } from '../models/tidy-link-row.interface';
import { TIDY_SCAN } from '../models/tidy-scan.const';
import { AiSettingsService } from '../settings/ai-settings.service';
import { filterTidySuggestions } from './filter-tidy-suggestions';

const TIDY_LINK_SELECT = {
  id: true,
  url: true,
  folderId: true,
  tags: { select: { tag: { select: { name: true } } } },
  suggestions: {
    where: { state: SUGGESTION_ROW_STATE.Suggested, more: false },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, kind: true, tagName: true, folderId: true },
  },
} as const satisfies Prisma.LinkSelect;

/** The apply answer when nothing was applied. */
function emptyApply(skipped: number): TidyApplyResponse {
  return { links: [], applied: 0, folders: 0, tagsAdded: 0, skipped, undo: { items: [] } };
}

/**
 * Tidy Unsorted (AI-2, #390): the review list over the stored suggestions of the user's links in
 * Unsorted, its count and one apply request per run. Nothing here calls the model or touches the
 * quota. Every statement filters by the session `userId`; foreign, missing and trashed ids are
 * ignored, so the answer never tells whether an id exists for someone else. Locks follow ADR 0033:
 * `folders:` before `tags:`.
 */
@Injectable()
export class AiTidyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly rules: RulesService,
    private readonly folders: FoldersService,
    private readonly tags: TagsService,
    private readonly embed: AiEmbedService,
  ) {}

  /**
   * `GET /api/ai/tidy`: newest first, at most `TIDY_LIMIT.PageMax`, after the link `after` when it
   * is one of the user's (the next page); empty while AI is off.
   */
  async list(userId: string, after?: string, importId?: string): Promise<TidyListResponse> {
    const reviewable = await this.reviewable(userId, after, importId);
    const page = reviewable.slice(0, TIDY_LIMIT.PageMax);
    if (page.length === 0) return { items: [], total: reviewable.length };
    const rows = await this.prisma.link.findMany({
      where: { userId, deletedAt: null, id: { in: page.map((entry) => entry.id) } },
      include: LINK_INCLUDE,
    });
    const byId = new Map(rows.map((row) => [row.id, toLinkResponse(row)]));
    const items: TidyItem[] = [];
    for (const entry of page) {
      const link = byId.get(entry.id);
      if (link !== undefined) items.push({ link, suggestions: entry.suggestions });
    }
    return { items, total: reviewable.length };
  }

  /** `GET /api/ai/tidy/count`: the same filter as the list (and the same `import` scope). */
  async count(userId: string, importId?: string): Promise<TidyCountResponse> {
    return { total: (await this.reviewable(userId, undefined, importId)).length };
  }

  /**
   * `POST /api/ai/tidy/apply`: one transaction for the whole run. Per item only the selected
   * `suggested` rows of the user's live link count; a folder only while the link is still in
   * Unsorted (a folder the user chose meanwhile is never replaced); tags past `LINK_LIMIT.TagsMax`
   * are left off and counted as skipped. Applied rows become `accepted`, the rest stay. The answer
   * and its `undo` payload hold only what the writes really changed. 409 while AI is off.
   */
  async apply(userId: string, request: TidyApplyRequest): Promise<TidyApplyResponse> {
    const stored = await this.settings.read(this.prisma, userId);
    if (!stored.settings.enabled) throw new ConflictException(AI_ERROR_MESSAGE.AiOff);
    try {
      const response = await this.prisma.$transaction((tx) => this.applyIn(tx, userId, request));
      if (response.tagsAdded > 0) await this.embed.kick(userId);
      return response;
    } catch (error) {
      if (hasPrismaCode(error, PRISMA_ERROR_CODE.ForeignKeyViolation)) {
        throw new ConflictException(LINK_ERROR_MESSAGE.ChangedMeanwhile);
      }
      throw error;
    }
  }

  private async applyIn(
    tx: Prisma.TransactionClient,
    userId: string,
    request: TidyApplyRequest,
  ): Promise<TidyApplyResponse> {
    await this.folders.lockTree(tx, userId);
    await this.tags.lockUserTags(tx, userId);
    const rows = await tx.link.findMany({
      where: { userId, deletedAt: null, id: { in: request.items.map((item) => item.linkId) } },
      select: TIDY_LINK_SELECT,
    });
    const contextOf = await this.contexts(tx, userId, rows);
    const byId = new Map(rows.map((row) => [row.id, row]));
    const plans: TidyLinkPlan[] = [];
    let skipped = 0;
    for (const item of request.items) {
      const row = byId.get(item.linkId);
      if (row === undefined) continue;
      const selected = new Set(item.suggestionIds);
      const open = filterTidySuggestions(row.suggestions, contextOf(row)).filter((suggestion) =>
        selected.has(suggestion.id),
      );
      const plan: TidyLinkPlan = { linkId: row.id, folder: null, tags: [] };
      const folder = open.find((suggestion) => suggestion.kind === SUGGESTION_KIND.Folder);
      if (row.folderId === null && folder?.folderId) {
        plan.folder = { folderId: folder.folderId, suggestionId: folder.id };
      }
      let room = LINK_LIMIT.TagsMax - row.tags.length;
      const seen = new Set<string>();
      for (const suggestion of open) {
        if (suggestion.tagName === null) continue;
        const key = suggestion.tagName.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        if (room <= 0) {
          skipped += 1;
          continue;
        }
        room -= 1;
        plan.tags.push({ name: suggestion.tagName, suggestionId: suggestion.id });
      }
      if (plan.folder !== null || plan.tags.length > 0) plans.push(plan);
    }
    if (plans.length === 0) return emptyApply(skipped);

    const now = new Date();
    const moved = await this.moveAll(tx, userId, plans, now);
    const added = await this.tagAll(tx, userId, plans, now);

    // Only what the writes did counts: a link moved or tagged meanwhile (outside these locks) keeps
    // its state, its rows stay open and the answer and the undo payload leave that part out.
    const undo: TidyUndoItem[] = [];
    for (const plan of plans) {
      const folderId = plan.folder !== null && moved.has(plan.linkId) ? plan.folder : null;
      const tags = plan.tags.filter((tag) =>
        added.get(plan.linkId)?.has(normalizeTagName(tag.name).toLowerCase()),
      );
      if (folderId === null && tags.length === 0) continue;
      undo.push({
        linkId: plan.linkId,
        folderId: folderId?.folderId ?? null,
        tags: tags.map((tag) => tag.name),
        suggestionIds: [
          ...(folderId === null ? [] : [folderId.suggestionId]),
          ...tags.map((tag) => tag.suggestionId),
        ],
      });
    }
    if (undo.length === 0) return emptyApply(skipped);
    await tx.linkSuggestion.updateMany({
      where: {
        userId,
        state: SUGGESTION_ROW_STATE.Suggested,
        id: { in: undo.flatMap((item) => item.suggestionIds) },
      },
      data: { state: SUGGESTION_ROW_STATE.Accepted },
    });

    const links = await this.responses(
      tx,
      userId,
      undo.map((item) => item.linkId),
    );
    return {
      links,
      applied: undo.length,
      folders: undo.filter((item) => item.folderId !== null).length,
      tagsAdded: undo.reduce((sum, item) => sum + item.tags.length, 0),
      skipped,
      undo: { items: undo },
    };
  }

  /** Sets the planned folders on links still in Unsorted; answers the ids that moved. */
  private async moveAll(
    tx: Prisma.TransactionClient,
    userId: string,
    plans: readonly TidyLinkPlan[],
    now: Date,
  ): Promise<Set<string>> {
    const byFolder = new Map<string, string[]>();
    for (const plan of plans) {
      if (plan.folder === null) continue;
      const { folderId } = plan.folder;
      byFolder.set(folderId, [...(byFolder.get(folderId) ?? []), plan.linkId]);
    }
    const moved = new Set<string>();
    for (const [folderId, linkIds] of byFolder) {
      const rows = await tx.link.updateManyAndReturn({
        where: { userId, deletedAt: null, folderId: null, id: { in: linkIds } },
        data: { folderId, updatedAt: now },
        select: { id: true },
      });
      for (const row of rows) moved.add(row.id);
    }
    return moved;
  }

  /**
   * Adds the planned tags (a new tag is created); answers per link the lower-cased names that were
   * really added (a tag put on the link meanwhile is not).
   */
  private async tagAll(
    tx: Prisma.TransactionClient,
    userId: string,
    plans: readonly TidyLinkPlan[],
    now: Date,
  ): Promise<Map<string, Set<string>>> {
    const added = new Map<string, Set<string>>();
    const tagged = plans.filter((plan) => plan.tags.length > 0);
    if (tagged.length === 0) return added;
    const ids = await this.tags.resolveNames(
      userId,
      tagged.flatMap((plan) => plan.tags.map((tag) => tag.name)),
      tx,
    );
    const idOf = await this.tagIdsByKey(tx, userId, ids);
    const keyOf = new Map([...idOf].map(([key, id]) => [id, key]));
    const pairs = tagged.flatMap((plan) =>
      plan.tags.flatMap((tag) => {
        const tagId = idOf.get(normalizeTagName(tag.name).toLowerCase());
        return tagId === undefined ? [] : [{ linkId: plan.linkId, tagId }];
      }),
    );
    if (pairs.length === 0) return added;
    const created = await tx.linkTag.createManyAndReturn({
      data: pairs,
      skipDuplicates: true,
      select: { linkId: true, tagId: true },
    });
    for (const pair of created) {
      const key = keyOf.get(pair.tagId);
      if (key === undefined) continue;
      added.set(pair.linkId, (added.get(pair.linkId) ?? new Set<string>()).add(key));
    }
    if (added.size > 0) {
      await markEmbeddingsStale(tx, userId, { linkIds: [...added.keys()] });
      await tx.link.updateMany({
        where: { userId, deletedAt: null, id: { in: [...added.keys()] } },
        data: { updatedAt: now },
      });
    }
    return added;
  }

  /**
   * The user's links in Unsorted with something to review, newest first, older than the user's link
   * `after` when given, at most `TIDY_SCAN.RowsMax` read (`[]` while AI is off). With `importId`
   * (ADR 0056 decision 9) the scope is the user's live links of that import in any folder instead
   * of Unsorted (a foreign or unknown import matches no row); a link already in a folder keeps only
   * its tag suggestions, since `apply` never moves a link out of a folder.
   */
  private async reviewable(
    userId: string,
    after?: string,
    importId?: string,
  ): Promise<{ id: string; suggestions: TidyItem['suggestions'] }[]> {
    const stored = await this.settings.read(this.prisma, userId);
    if (!stored.settings.enabled) return [];
    const cursor =
      after === undefined
        ? null
        : await this.prisma.link.findFirst({
            where: { id: after, userId },
            select: { id: true, createdAt: true },
          });
    const rows = await this.prisma.link.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(importId === undefined ? { folderId: null } : { importId }),
        suggestions: { some: { userId, state: SUGGESTION_ROW_STATE.Suggested, more: false } },
        ...(cursor !== null && {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: TIDY_SCAN.RowsMax,
      select: TIDY_LINK_SELECT,
    });
    const contextOf = await this.contexts(this.prisma, userId, rows);
    return rows
      .map((row) => ({
        id: row.id,
        suggestions: filterTidySuggestions(row.suggestions, contextOf(row)).filter(
          (suggestion) =>
            importId === undefined ||
            row.folderId === null ||
            suggestion.kind !== SUGGESTION_KIND.Folder,
        ),
      }))
      .filter((entry) => entry.suggestions.length > 0);
  }

  /**
   * The filter context per link: the user's live folders among the suggested ones, the user's tag
   * names and the rules (one read each, whatever the number of links).
   */
  private async contexts(
    db: AiDbClient,
    userId: string,
    rows: readonly TidyLinkRow[],
  ): Promise<(row: TidyLinkRow) => TidyFilterContext> {
    const folderIds = [
      ...new Set(
        rows.flatMap((row) =>
          row.suggestions.flatMap((suggestion) =>
            suggestion.folderId === null ? [] : [suggestion.folderId],
          ),
        ),
      ),
    ];
    const hasTags = rows.some((row) => row.suggestions.some((suggestion) => suggestion.tagName));
    // One after the other: `db` may be an interactive transaction.
    const folders =
      folderIds.length === 0
        ? []
        : await db.folder.findMany({
            where: { userId, deletedAt: null, id: { in: folderIds } },
            select: { id: true },
          });
    const tags = hasTags
      ? await db.tag.findMany({ where: { userId }, select: { name: true } })
      : [];
    const matcher = await this.rules.matcher(db, userId);
    const liveFolderIds = new Set(folders.map((folder) => folder.id));
    const tagKeys = new Set(tags.map((tag) => tag.name.toLowerCase()));
    return (row) => ({
      liveFolderIds,
      tagKeys,
      linkTagKeys: new Set(row.tags.map((entry) => entry.tag.name.toLowerCase())),
      ruleDecidesFolder: (matcher(row.url)?.folderId ?? null) !== null,
    });
  }

  private async tagIdsByKey(
    db: AiDbClient,
    userId: string,
    ids: readonly string[],
  ): Promise<Map<string, string>> {
    const tags = await db.tag.findMany({
      where: { userId, id: { in: [...ids] } },
      select: { id: true, name: true },
    });
    return new Map(tags.map((tag) => [tag.name.toLowerCase(), tag.id]));
  }

  private async responses(
    db: AiDbClient,
    userId: string,
    linkIds: readonly string[],
  ): Promise<LinkResponse[]> {
    const rows = await db.link.findMany({
      where: { userId, deletedAt: null, id: { in: [...linkIds] } },
      include: LINK_INCLUDE,
    });
    const byId = new Map(rows.map((row) => [row.id, toLinkResponse(row)]));
    return linkIds.flatMap((id) => {
      const link = byId.get(id);
      return link === undefined ? [] : [link];
    });
  }
}
