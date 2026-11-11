import type { FeedbackSendErrorReason } from './models/feedback-send-error-reason.type';

/** A feedback message could not be sent; `reason` says which text the form shows. */
export class FeedbackSendError extends Error {
  constructor(readonly reason: FeedbackSendErrorReason) {
    super(`Feedback not sent: ${reason}`);
    this.name = 'FeedbackSendError';
  }
}
