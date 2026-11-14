import type { FeedbackClientInfo } from './feedback-client-info.interface';
import type { FeedbackMessageKind } from './feedback-message-kind.type';

/**
 * `POST /api/feedback/messages`; answers `FeedbackMessage`. Screenshots (up to
 * `FEEDBACK_MESSAGE_LIMIT.ScreenshotsMax`) follow one by one to `feedbackScreenshotsPath(id)`.
 */
export interface SendFeedbackRequest {
  kind: FeedbackMessageKind;
  /** 1 to `FEEDBACK_MESSAGE_LIMIT.TextMax` characters after trimming. */
  text: string;
  client?: FeedbackClientInfo;
}
