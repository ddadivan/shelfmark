import { FEEDBACK_MILESTONE } from './feedback-milestone.const';
import type { FeedbackMilestone } from './feedback-milestone.type';

/** Days after sign-up (fixed 24 hour days) at which each milestone is reached; ascending. */
export const FEEDBACK_MILESTONE_DAYS = {
  [FEEDBACK_MILESTONE.Day3]: 3,
  [FEEDBACK_MILESTONE.Week1]: 7,
  [FEEDBACK_MILESTONE.Month1]: 30,
  [FEEDBACK_MILESTONE.Year1]: 365,
} as const satisfies Record<FeedbackMilestone, number>;
