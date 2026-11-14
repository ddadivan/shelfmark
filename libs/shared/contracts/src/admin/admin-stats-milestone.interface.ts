import type { FeedbackMilestone } from '../feedback/feedback-milestone.type';
import type { AdminStatsBucket } from './admin-stats-bucket.interface';

/**
 * Ratings of one milestone by real users. `answered` and `skipped` are plain counts; the mean and
 * median are `null` and `groups` is empty with fewer than `ADMIN_STATS_LIMIT.MinGroup` answers.
 * `groups` holds the score groups (`ADMIN_STATS_SCORE_GROUP`) with small ones merged into `other`.
 * Comments are never part of the stats.
 */
export interface AdminStatsMilestone {
  milestone: FeedbackMilestone;
  answered: number;
  skipped: number;
  mean: number | null;
  median: number | null;
  groups: AdminStatsBucket[];
}
