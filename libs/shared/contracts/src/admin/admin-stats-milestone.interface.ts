import type { FeedbackMilestone } from '../feedback/feedback-milestone.type';

/**
 * Ratings of one milestone by real users. `answered` and `skipped` are plain counts; the mean,
 * median and the three score groups (1 to 6, 7 to 8, 9 to 10) are `null` with fewer than
 * `ADMIN_STATS_LIMIT.MinGroup` answers. Comments are never part of the stats.
 */
export interface AdminStatsMilestone {
  milestone: FeedbackMilestone;
  answered: number;
  skipped: number;
  mean: number | null;
  median: number | null;
  low: number | null;
  mid: number | null;
  high: number | null;
}
