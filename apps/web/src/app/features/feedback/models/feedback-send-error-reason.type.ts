import type { FEEDBACK_SEND_ERROR_REASON } from './feedback-send-error-reason.const';

export type FeedbackSendErrorReason =
  (typeof FEEDBACK_SEND_ERROR_REASON)[keyof typeof FEEDBACK_SEND_ERROR_REASON];
