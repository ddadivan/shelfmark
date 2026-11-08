import type { FEEDBACK_MILESTONE } from './feedback-milestone.const';

export type FeedbackMilestone = (typeof FEEDBACK_MILESTONE)[keyof typeof FEEDBACK_MILESTONE];
