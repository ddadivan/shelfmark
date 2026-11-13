import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AUTH_PROVIDER,
  LINK_IMAGE_KIND,
  ME_STATS_LIMIT,
  statsWeekStarts,
  type AuthProvider,
  type ConnectedAccount,
  type MeStatsResponse,
} from '@shelfmark/contracts';
import { linkImagePath } from '../links/images/link-image-path';
import { PrismaService } from '../prisma/prisma.service';
import type { CountRow } from './models/count-row.interface';
import type { TopSiteRow } from './models/top-site-row.interface';

const PROVIDERS: readonly string[] = Object.values(AUTH_PROVIDER);

function isProvider(value: string): value is AuthProvider {
  return PROVIDERS.includes(value);
}

/**
 * `GET /api/me/stats` (#352): the "Your shelf" numbers and the connected accounts. Everything is
 * aggregated in the database and filtered by the session user; links and folders in Trash are
 * left out. Plain SQL only through tagged templates (parameterised).
 */
@Injectable()
export class MeStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(userId: string, now = new Date()): Promise<MeStatsResponse> {
    const weeks = statsWeekStarts(now);
    const live = { userId, deletedAt: null };
    const [user, links, folderCount, tagCount, topSites, topTags, weekly, accounts] =
      await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
        this.prisma.link.aggregate({ where: live, _count: true, _min: { createdAt: true } }),
        this.prisma.folder.count({ where: live }),
        this.prisma.tag.count({ where: { userId } }),
        this.topSites(userId),
        this.topTags(userId),
        this.weekly(userId, weeks[0]),
        this.prisma.account.findMany({
          where: { userId },
          select: { providerId: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);
    if (!user) throw new NotFoundException();

    const perWeek = new Map(weekly.map((row) => [row.key, row.count]));
    return {
      linkCount: links._count,
      folderCount,
      tagCount,
      topSites: topSites.map((row) => ({
        host: row.host,
        count: row.count,
        faviconUrl:
          row.linkId !== null && row.sha256 !== null
            ? linkImagePath(row.linkId, LINK_IMAGE_KIND.Favicon, row.sha256)
            : null,
      })),
      topTags: topTags.map((row) => ({ name: row.key, count: row.count })),
      weeklyLinks: weeks.map((weekStart) => ({ weekStart, count: perWeek.get(weekStart) ?? 0 })),
      memberSince: user.createdAt.toISOString(),
      oldestLinkAt: links._min.createdAt?.toISOString() ?? null,
      connectedAccounts: accounts.flatMap((account): ConnectedAccount[] =>
        isProvider(account.providerId)
          ? [{ provider: account.providerId, connectedAt: account.createdAt.toISOString() }]
          : [],
      ),
    };
  }

  /**
   * The hosts with the most live links (lower case, `www.` dropped, like the web's display host),
   * each with the captured favicon of its newest link that has one. Ties sort by host (code points).
   */
  private topSites(userId: string): Promise<TopSiteRow[]> {
    return this.prisma.$queryRaw<TopSiteRow[]>`
      WITH hosts AS (
        SELECT l.id, l.created_at,
          regexp_replace(
            lower(substring(l.url FROM '^[A-Za-z][A-Za-z0-9+.-]*://(?:[^/?#@]*@)?([^/?#:]+)')),
            '^www[.]', ''
          ) AS host
        FROM links l
        WHERE l.user_id = ${userId}::uuid AND l.deleted_at IS NULL
      ),
      top AS (
        SELECT host, count(*)::int AS count
        FROM hosts
        WHERE host IS NOT NULL AND host <> ''
        GROUP BY host
        ORDER BY count DESC, host COLLATE "C"
        LIMIT ${ME_STATS_LIMIT.TopSites}
      )
      SELECT top.host, top.count, fav.link_id::text AS "linkId", fav.sha256
      FROM top
        LEFT JOIN LATERAL (
          SELECT i.link_id, i.sha256
          FROM hosts h
            JOIN link_images i ON i.link_id = h.id AND i.user_id = ${userId}::uuid
              AND i.kind = ${LINK_IMAGE_KIND.Favicon}
          WHERE h.host = top.host
          ORDER BY h.created_at DESC, h.id DESC
          LIMIT 1
        ) fav ON true
      ORDER BY top.count DESC, top.host COLLATE "C"`;
  }

  /** Tags on at least one live link, most used first; ties by name (code points). */
  private topTags(userId: string): Promise<CountRow[]> {
    return this.prisma.$queryRaw<CountRow[]>`
      SELECT t.name AS key, count(*)::int AS count
      FROM link_tags lt
        JOIN tags t ON t.id = lt.tag_id
        JOIN links l ON l.id = lt.link_id
      WHERE t.user_id = ${userId}::uuid AND l.user_id = ${userId}::uuid AND l.deleted_at IS NULL
      GROUP BY t.name
      ORDER BY count DESC, t.name COLLATE "C"
      LIMIT ${ME_STATS_LIMIT.TopTags}`;
  }

  /** Live links per UTC week (Monday, `YYYY-MM-DD`) from `firstWeek` on. */
  private weekly(userId: string, firstWeek: string): Promise<CountRow[]> {
    return this.prisma.$queryRaw<CountRow[]>`
      SELECT to_char(date_trunc('week', l.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS key,
        count(*)::int AS count
      FROM links l
      WHERE l.user_id = ${userId}::uuid AND l.deleted_at IS NULL
        AND l.created_at >= ${`${firstWeek}T00:00:00Z`}::timestamptz
      GROUP BY 1`;
  }
}
