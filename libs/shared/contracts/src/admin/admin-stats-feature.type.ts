import type { ADMIN_STATS_FEATURE } from './admin-stats-feature.const';

export type AdminStatsFeature = (typeof ADMIN_STATS_FEATURE)[keyof typeof ADMIN_STATS_FEATURE];
