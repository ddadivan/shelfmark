import type { AdminStatsPoint } from './admin-stats-point.interface';
import type { AdminStatsRate } from './admin-stats-rate.interface';

/** Who uses Shelfmark: real users (demo and admin accounts excluded), sign-ups and return. */
export interface AdminStatsOverview {
  realUsers: number;
  /** Demo sandboxes that exist now (they live 24 hours). */
  demoSandboxes: number;
  onboarded: AdminStatsRate;
  /** `ADMIN_STATS_LIMIT.SignUpDays` UTC days, oldest first, zero-filled, today last. */
  signUpsByDay: AdminStatsPoint[];
  /** `ADMIN_STATS_LIMIT.SignUpWeeks` ISO weeks (Monday), oldest first, this week last. */
  signUpsByWeek: AdminStatsPoint[];
  active7d: AdminStatsRate;
  active30d: AdminStatsRate;
  /** Base: users who joined at least 7 days ago; count: active again 7 or more days after joining. */
  returnedAfterWeek: AdminStatsRate;
  /** The same with 30 days. */
  returnedAfterMonth: AdminStatsRate;
  /** UTC day the activity date started being recorded (earlier days are estimated); `null` when unknown. */
  activitySince: string | null;
}
