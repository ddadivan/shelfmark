import type { AdminStatsRate } from '@shelfmark/contracts';

/** `count` of `base` as a rate; `null` count and share while the base is below `minGroup`. */
export function toAdminStatsRate(base: number, count: number, minGroup: number): AdminStatsRate {
  if (base < minGroup || base <= 0) return { base, count: null, share: null };
  return { base, count, share: Math.round((count / base) * 1000) / 1000 };
}
