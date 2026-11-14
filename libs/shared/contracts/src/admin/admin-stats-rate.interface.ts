/**
 * A share of a group: `count` of `base` users, `share` from 0 to 1. Both are `null` while `base`
 * is below `ADMIN_STATS_LIMIT.MinGroup` ("not enough users yet").
 */
export interface AdminStatsRate {
  base: number;
  count: number | null;
  share: number | null;
}
