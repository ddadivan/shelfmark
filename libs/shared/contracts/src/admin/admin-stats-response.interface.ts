import type { AdminStatsFeatures } from './admin-stats-features.interface';
import type { AdminStatsOverview } from './admin-stats-overview.interface';
import type { AdminStatsPreferences } from './admin-stats-preferences.interface';
import type { AdminStatsRatings } from './admin-stats-ratings.interface';

/**
 * `GET /api/admin/stats` (ADR 0045): aggregates over real users only, computed on request. The
 * shape is an allow-list: counts, shares, means, medians and buckets; never an id, name, email,
 * URL, note, comment or a per-user value.
 */
export interface AdminStatsResponse {
  /** ISO time the numbers were computed. */
  generatedAt: string;
  /** `ADMIN_STATS_LIMIT.MinGroup`, for the page copy. */
  minGroup: number;
  overview: AdminStatsOverview;
  features: AdminStatsFeatures;
  preferences: AdminStatsPreferences;
  ratings: AdminStatsRatings;
}
