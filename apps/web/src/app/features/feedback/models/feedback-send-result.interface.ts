import type { FeedbackMessage } from '@shelfmark/contracts';

/** What sending a message with its screenshots gave. */
export interface FeedbackSendResult {
  /** The saved message, with the screenshots that were attached. */
  message: FeedbackMessage;
  /** Screenshots that could not be attached (the message itself was sent). */
  screenshotsFailed: number;
}
