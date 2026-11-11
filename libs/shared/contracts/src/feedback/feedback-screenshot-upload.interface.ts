import type { FeedbackScreenshotType } from './feedback-screenshot-type.type';

/** A screenshot sent with a feedback message. */
export interface FeedbackScreenshotUpload {
  type: FeedbackScreenshotType;
  /** The image as base64, at most `FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes` once decoded. */
  data: string;
}
