import type { AdminStatsRate } from '@shelfmark/contracts';

/**
 * `count` of `base` as a rate under the minimum group size (ADR 0045). Count and share are `null`
 * while the base is below `minGroup`, and also when either side of the split is a group of 1 to
 * `minGroup - 1` people: the users who have it (`count`) or the ones who do not (`base - count`).
 * Nobody (0) and everybody (`base`) point at no one and are shown.
 */
export function toAdminStatsRate(base: number, count: number, minGroup: number): AdminStatsRate {
  const small = (group: number) => group > 0 && group < minGroup;
  if (base < minGroup || base <= 0 || small(count) || small(base - count)) {
    return { base, count: null, share: null };
  }
  return { base, count, share: Math.round((count / base) * 1000) / 1000 };
}
