import type { AdminStatsAdoption } from './admin-stats-adoption.interface';
import type { AdminStatsLinksPerUser } from './admin-stats-links-per-user.interface';

export interface AdminStatsFeatures {
  linksPerUser: AdminStatsLinksPerUser;
  /** One row per `ADMIN_STATS_FEATURE`, in its order. */
  adoption: AdminStatsAdoption[];
}
