import type { FeedbackMilestone } from './feedback-milestone.type';
import type { FeedbackScore } from './feedback-score.type';

export interface RecordFeedbackRequest {
  milestone: FeedbackMilestone;
  /** null records "not now" (no comment allowed). */
  score: FeedbackScore | null;
  /** Optional; a repeat for the same milestone appends it (at most `FEEDBACK_LIMIT.CommentMax` in total). */
  comment?: string;
}
