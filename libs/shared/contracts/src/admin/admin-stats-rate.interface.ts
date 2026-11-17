/**
 * A share of a group: `count` of `base` users, `share` from 0 to 1. Both are `null` while `base`
 * is below `ADMIN_STATS_LIMIT.MinGroup` ("not enough users yet"), and when the users who have it
 * or the ones who do not are a group of 1 to `MinGroup - 1` people.
 */
export interface AdminStatsRate {
  base: number;
  count: number | null;
  share: number | null;
}
