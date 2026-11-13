/** Query of `GET /api/me/stats` (#352). */
export interface MeStatsQuery {
  /** ISO weekday the weeks start on (`ME_STATS_FIRST_DAY`: 1 Monday … 7 Sunday, default 1). */
  firstDay?: number;
}
