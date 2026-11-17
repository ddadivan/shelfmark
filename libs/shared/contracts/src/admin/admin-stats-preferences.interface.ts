import type { AdminStatsBucket } from './admin-stats-bucket.interface';

/** Settings distributions over real users; small buckets merged into `other`. */
export interface AdminStatsPreferences {
  /** `THEME_PREFERENCE` values of users who chose an appearance, plus `never`. */
  theme: AdminStatsBucket[];
  /** `INTERFACE_LANGUAGE` values of users who chose a language, plus `never`. */
  language: AdminStatsBucket[];
  /** `TRASH_RETENTION_DAYS` as text (`7`, `30`, `90`). */
  trashRetention: AdminStatsBucket[];
}
