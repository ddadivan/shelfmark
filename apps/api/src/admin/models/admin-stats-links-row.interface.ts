/** Live links per real user: mean, median and the histogram counts (`ADMIN_STATS_LINKS_BUCKET`). */
export interface AdminStatsLinksRow {
  mean: number | null;
  median: number | null;
  none: number;
  few: number;
  some: number;
  many: number;
  lots: number;
}
