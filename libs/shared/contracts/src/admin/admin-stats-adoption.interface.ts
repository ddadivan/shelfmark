import type { AdminStatsFeature } from './admin-stats-feature.type';
import type { AdminStatsRate } from './admin-stats-rate.interface';

/** Real users who use one feature; the base is every real user. */
export interface AdminStatsAdoption {
  feature: AdminStatsFeature;
  rate: AdminStatsRate;
}
