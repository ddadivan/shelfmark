import { ADMIN_STATS_BUCKET_KEY, type AdminStatsBucket } from '@shelfmark/contracts';
import type { AdminStatsCount } from './models/admin-stats-count.interface';

/**
 * The minimum group size for a distribution (ADR 0045). Buckets of 1 to `minGroup - 1` users merge
 * into `other` (last). While "Other" would hold a single value (it could be told by elimination)
 * or fewer than `minGroup` users, the next smallest non-empty bucket joins it; if nothing is left
 * to join and it is still too small, its count is `null`. Empty buckets stay: a zero points at
 * no one. The input order is kept.
 */
export function suppressSmallGroups(
  buckets: readonly AdminStatsCount[],
  minGroup: number,
): AdminStatsBucket[] {
  const merged = new Set(
    buckets.filter((b) => b.count > 0 && b.count < minGroup).map((b) => b.key),
  );
  if (merged.size === 0) return buckets.map((b) => ({ key: b.key, count: b.count }));
  let other = buckets.filter((b) => merged.has(b.key)).reduce((sum, b) => sum + b.count, 0);
  while (merged.size < 2 || other < minGroup) {
    const next = buckets
      .filter((b) => !merged.has(b.key) && b.count > 0)
      .sort((a, b) => a.count - b.count)[0];
    if (next === undefined) break;
    merged.add(next.key);
    other += next.count;
  }
  return [
    ...buckets.filter((b) => !merged.has(b.key)).map((b) => ({ key: b.key, count: b.count })),
    { key: ADMIN_STATS_BUCKET_KEY.Other, count: other >= minGroup ? other : null },
  ];
}
