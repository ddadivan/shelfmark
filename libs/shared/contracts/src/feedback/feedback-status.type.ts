import type { FEEDBACK_STATUS } from './feedback-status.const';

export type FeedbackStatus = (typeof FEEDBACK_STATUS)[keyof typeof FEEDBACK_STATUS];
