import type { FeedbackMilestone } from './feedback-milestone.type';

/** Body of `POST /api/feedback/rating-prompt/views`: the rating prompt was just shown for this milestone. */
export interface RecordRatingPromptViewRequest {
  milestone: FeedbackMilestone;
}
