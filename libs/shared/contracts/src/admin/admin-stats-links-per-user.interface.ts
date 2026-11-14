import type { AdminStatsBucket } from './admin-stats-bucket.interface';

/** Live links per real user (users without links included). No maximum: it would point at one person. */
export interface AdminStatsLinksPerUser {
  mean: number | null;
  median: number | null;
  /** Keys from `ADMIN_STATS_LINKS_BUCKET` (and `other`), smallest first. */
  buckets: AdminStatsBucket[];
}
