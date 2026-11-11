import type { FeedbackMessage } from './feedback-message.interface';

/** `GET /api/feedback/messages`: the user's messages, newest first (at most 100). */
export interface ListFeedbackMessagesResponse {
  items: FeedbackMessage[];
}
