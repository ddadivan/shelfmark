import type { FEEDBACK_MESSAGE_KIND } from './feedback-message-kind.const';

export type FeedbackMessageKind =
  (typeof FEEDBACK_MESSAGE_KIND)[keyof typeof FEEDBACK_MESSAGE_KIND];
