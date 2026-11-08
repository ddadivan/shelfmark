import type { FeedbackMilestone } from './feedback-milestone.type';

export interface FeedbackPromptResponse {
  /** The milestone to ask about now, or null (nothing due, demo user, onboarding pending). */
  milestone: FeedbackMilestone | null;
}
