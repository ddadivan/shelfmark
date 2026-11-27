import { Injectable } from '@nestjs/common';
import {
  AI_SEARCH_STATE,
  AI_TIER,
  REDISCOVER_LIMIT,
  REDISCOVER_MODE,
  type AuthUser,
  type RediscoverMode,
  type RediscoverResponse,
} from '@shelfmark/contracts';
import { Prisma } from '../generated/prisma/client';
import { AiSearchStatusService } from '../ai/embeddings/ai-search-status.service';
import { AiProviderRegistry } from '../ai/providers/ai-provider.registry';
import { AiSettingsService } from '../ai/settings/ai-settings.service';
import { LINK_INCLUDE } from '../links/models/link-include.const';
import { toLinkResponse } from '../links/to-link-response';
import { PrismaService } from '../prisma/prisma.service';
import { isoWeek } from './iso-week';
import type { ThemeHit } from './models/theme-hit.interface';
import { requireLiveLink } from '../links/link-ownership';

const MS_PER_DAY = 86_400_000;

/**
 * "From your shelf" (F8), computed on request, no model and no provider call. Candidates are the
 * session user's live links saved at least `SavedDaysMin` days ago, never opened or last opened at
 * least `OpenedDaysMin` days ago, without a future reminder and not hidden. Theme mode (AI on, the AI
 * pack, search by meaning `ready`): the candidates nearest the mean stored vector of the links saved
 * in the last `ThemeDays` days (at least `ThemeLinksMin`), above the provider floor, labelled with the
 * most frequent tag (else folder) of those recent links. Otherwise, or with fewer than `ItemsMin`
 * picks, forgotten mode: a weekly deterministic order. One block per ISO week, dismissible per week.
 */
@Injectable()
export class RediscoverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly searchStatus: AiSearchStatusService,
    private readonly registry: AiProviderRegistry,
  ) {}

  async block(user: AuthUser, now: Date = new Date()): Promise<RediscoverResponse> {
    const week = isoWeek(now);
    const empty: RediscoverResponse = { week, mode: null, theme: null, items: [] };
    const state = await this.prisma.rediscoverState.findUnique({
      where: { userId: user.id },
      select: { dismissedWeek: true },
    });
    if (state?.dismissedWeek === week) return empty;

    const theme = await this.themePicks(user, now);
    if (theme !== null) {
      return { week, ...theme.block, items: await this.load(user.id, theme.ids) };
    }
    const ids = await this.forgottenPicks(user.id, week, now);
    if (ids.length < REDISCOVER_LIMIT.ItemsMin) return empty;
    return {
      week,
      mode: REDISCOVER_MODE.Forgotten,
      theme: null,
      items: await this.load(user.id, ids),
    };
  }

  /** Hides the block until next week (idempotent). */
  async dismiss(userId: string, now: Date = new Date()): Promise<void> {
    const week = isoWeek(now);
    await this.prisma.rediscoverState.upsert({
      where: { userId },
      create: { userId, dismissedWeek: week },
      update: { dismissedWeek: week },
    });
  }

  /** "Not interested": the user's live link never shows again; a foreign or missing one is a 404. */
  async hide(userId: string, linkId: string): Promise<void> {
    await requireLiveLink(this.prisma, userId, linkId, { select: { id: true } });
    await this.prisma.rediscoverHidden.createMany({
      data: [{ userId, linkId }],
      skipDuplicates: true,
    });
  }

  /** The SQL conditions of a candidate on `links l` (the session user's rows only). */
  private candidate(userId: string, now: Date): Prisma.Sql {
    const savedBefore = new Date(now.getTime() - REDISCOVER_LIMIT.SavedDaysMin * MS_PER_DAY);
    const openedBefore = new Date(now.getTime() - REDISCOVER_LIMIT.OpenedDaysMin * MS_PER_DAY);
    return Prisma.sql`l.user_id = ${userId}::uuid AND l.deleted_at IS NULL
      AND l.created_at <= ${savedBefore}
      AND (l.last_opened_at IS NULL OR l.last_opened_at <= ${openedBefore})
      AND (l.remind_at IS NULL OR l.remind_at <= ${now})
      AND NOT EXISTS (SELECT 1 FROM rediscover_hidden h
        WHERE h.user_id = l.user_id AND h.link_id = l.id)`;
  }

  /** Weekly order: `md5(link id || week)`, oldest first on a tie; at most `ItemsMax`. */
  private async forgottenPicks(userId: string, week: string, now: Date): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT l.id::text AS id FROM links l
      WHERE ${this.candidate(userId, now)}
      ORDER BY md5(l.id::text || ${week}), l.created_at, l.id
      LIMIT ${REDISCOVER_LIMIT.ItemsMax}`;
    return rows.map((row) => row.id);
  }

  /** Theme mode picks with their label, or `null` when theme mode does not apply. */
  private async themePicks(
    user: AuthUser,
    now: Date,
  ): Promise<{ ids: string[]; block: { mode: RediscoverMode; theme: string } } | null> {
    const entitlements = await this.settings.entitlements(this.prisma, user.id);
    const stored = await this.settings.read(this.prisma, user.id);
    if (!stored.settings.enabled || entitlements.aiTier !== AI_TIER.AiPack) return null;
    const status = await this.searchStatus.status(user.id, stored, entitlements.aiTier);
    if (status.state !== AI_SEARCH_STATE.Ready) return null;

    const provider = this.registry.embeddingsFor(user);
    const since = new Date(now.getTime() - REDISCOVER_LIMIT.ThemeDays * MS_PER_DAY);
    const hits = await this.prisma.$queryRaw<ThemeHit[]>`
      WITH recent AS (
        SELECT avg(e.embedding::vector) AS mean, count(*)::int AS n
        FROM link_embeddings e
        JOIN links r ON r.id = e.link_id AND r.user_id = e.user_id
        WHERE e.user_id = ${user.id}::uuid AND e.model = ${provider.model}
          AND r.deleted_at IS NULL AND r.created_at > ${since}
      )
      SELECT l.id::text AS "linkId",
        (1 - (e.embedding::vector <=> recent.mean))::float8 AS similarity
      FROM links l
      JOIN link_embeddings e ON e.link_id = l.id AND e.user_id = l.user_id
      CROSS JOIN recent
      WHERE ${this.candidate(user.id, now)} AND e.model = ${provider.model}
        AND recent.n >= ${REDISCOVER_LIMIT.ThemeLinksMin}
      ORDER BY e.embedding::vector <=> recent.mean, l.id
      LIMIT ${REDISCOVER_LIMIT.ItemsMax}`;
    const ids = hits
      .filter((hit) => hit.similarity >= provider.minSimilarity)
      .map((hit) => hit.linkId);
    if (ids.length < REDISCOVER_LIMIT.ItemsMin) return null;
    const theme = await this.themeLabel(user.id, since);
    return theme === null ? null : { ids, block: { mode: REDISCOVER_MODE.Theme, theme } };
  }

  /** The most frequent tag name among the recent live links, else their most frequent live folder. */
  private async themeLabel(userId: string, since: Date): Promise<string | null> {
    const tags = await this.prisma.$queryRaw<{ name: string }[]>`
      SELECT t.name FROM links l
      JOIN link_tags lt ON lt.link_id = l.id
      JOIN tags t ON t.id = lt.tag_id AND t.user_id = l.user_id
      WHERE l.user_id = ${userId}::uuid AND l.deleted_at IS NULL AND l.created_at > ${since}
      GROUP BY t.name
      ORDER BY count(*) DESC, t.name COLLATE "C"
      LIMIT 1`;
    if (tags[0] !== undefined) return tags[0].name;
    const folders = await this.prisma.$queryRaw<{ name: string }[]>`
      SELECT f.name FROM links l
      JOIN folders f ON f.id = l.folder_id AND f.user_id = l.user_id AND f.deleted_at IS NULL
      WHERE l.user_id = ${userId}::uuid AND l.deleted_at IS NULL AND l.created_at > ${since}
      GROUP BY f.id, f.name
      ORDER BY count(*) DESC, f.name COLLATE "C"
      LIMIT 1`;
    return folders[0]?.name ?? null;
  }

  /** The picks as link responses, in pick order (session user, live links only). */
  private async load(userId: string, ids: readonly string[]) {
    const rows = await this.prisma.link.findMany({
      where: { userId, deletedAt: null, id: { in: [...ids] } },
      include: LINK_INCLUDE,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row === undefined ? [] : [toLinkResponse(row)];
    });
  }
}
