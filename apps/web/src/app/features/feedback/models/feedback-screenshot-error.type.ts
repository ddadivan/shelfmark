import type { FEEDBACK_SCREENSHOT_ERROR } from './feedback-screenshot-error.const';

export type FeedbackScreenshotError =
  (typeof FEEDBACK_SCREENSHOT_ERROR)[keyof typeof FEEDBACK_SCREENSHOT_ERROR];
