import type { FeedbackScreenshotType } from './feedback-screenshot-type.type';

/** One screenshot attached to a feedback message (`POST feedbackScreenshotsPath(id)`). */
export interface FeedbackScreenshotUpload {
  type: FeedbackScreenshotType;
  /** The image as base64, at most `FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes` once decoded. */
  data: string;
}
