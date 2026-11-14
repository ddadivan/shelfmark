import type { FeedbackMessageKind } from './feedback-message-kind.type';
import type { FeedbackStatus } from './feedback-status.type';

/** One message in Settings › Your feedback. */
export interface FeedbackMessage {
  id: string;
  kind: FeedbackMessageKind;
  text: string;
  status: FeedbackStatus;
  /** The author's answer, or `null`. */
  reply: string | null;
  /**
   * Same-origin paths of the screenshots in the order they were attached (`GET`, owner only), at
   * most `FEEDBACK_MESSAGE_LIMIT.ScreenshotsMax`; empty without any.
   */
  screenshotUrls: string[];
  createdAt: string;
  updatedAt: string;
}
