import type { FeedbackClientInfo } from './feedback-client-info.interface';
import type { FeedbackMessageKind } from './feedback-message-kind.type';
import type { FeedbackScreenshotUpload } from './feedback-screenshot-upload.interface';

/** `POST /api/feedback/messages`; answers `FeedbackMessage`. */
export interface SendFeedbackRequest {
  kind: FeedbackMessageKind;
  /** 1 to `FEEDBACK_MESSAGE_LIMIT.TextMax` characters after trimming. */
  text: string;
  screenshot?: FeedbackScreenshotUpload;
  client?: FeedbackClientInfo;
}
