import type { AdminStatsBucket } from './admin-stats-bucket.interface';
import type { AdminStatsMilestone } from './admin-stats-milestone.interface';

export interface AdminStatsRatings {
  /** One row per `FEEDBACK_MILESTONE`, in its order. */
  milestones: AdminStatsMilestone[];
  /** Messages of real users per `FEEDBACK_MESSAGE_KIND` (plain counts, the inbox shows them anyway). */
  messagesByKind: AdminStatsBucket[];
  /** Messages of real users per `FEEDBACK_STATUS`. */
  messagesByStatus: AdminStatsBucket[];
}
