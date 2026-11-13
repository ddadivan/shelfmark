import { ME_STATS_LIMIT, statsWeekStarts, type MeStatsResponse } from '@shelfmark/contracts';
import { displayHost } from '../../links/utils/http-url';
import type { MockStatsInput } from './models/mock-stats-input.interface';

/** Code-point order, like the API's `COLLATE "C"`. */
function byCodePoint(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Counts per key, most first, then by key (code points), the first `limit`. */
function top(keys: readonly string[], limit: number): [string, number][] {
  const counts = new Map<string, number>();
  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].sort(([a, x], [b, y]) => y - x || byCodePoint(a, b)).slice(0, limit);
}

/**
 * The mock twin of `MeStatsService` (apps/api): the same counts and orders over the live mock
 * links (the contract scenarios compare the two). The favicon of a site is the one of its newest
 * link that has one.
 */
export function buildMockStats(input: MockStatsInput): MeStatsResponse {
  const { links } = input;
  const newestFirst = [...links].sort((a, b) => byCodePoint(b.createdAt, a.createdAt));
  const sites = top(
    links.map((link) => displayHost(link.url).toLowerCase()),
    ME_STATS_LIMIT.TopSites,
  ).map(([host, count]) => ({
    host,
    count,
    faviconUrl:
      newestFirst.find(
        (link) => link.faviconUrl !== null && displayHost(link.url).toLowerCase() === host,
      )?.faviconUrl ?? null,
  }));
  const weeks = statsWeekStarts(input.now);
  const perWeek = new Map<string, number>();
  for (const link of links) {
    const [week] = statsWeekStarts(new Date(link.createdAt)).slice(-1);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }
  const oldest = newestFirst.at(-1);
  return {
    linkCount: links.length,
    folderCount: input.folderCount,
    tagCount: input.tagCount,
    topSites: sites,
    topTags: top(
      links.flatMap((link) => link.tags),
      ME_STATS_LIMIT.TopTags,
    ).map(([name, count]) => ({ name, count })),
    weeklyLinks: weeks.map((weekStart) => ({ weekStart, count: perWeek.get(weekStart) ?? 0 })),
    memberSince: input.memberSince,
    oldestLinkAt: oldest?.createdAt ?? null,
    connectedAccounts: [...input.connectedAccounts],
  };
}
