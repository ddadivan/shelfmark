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
  /** Same-origin path of the screenshot (`GET`, owner only), or `null`. */
  screenshotUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
