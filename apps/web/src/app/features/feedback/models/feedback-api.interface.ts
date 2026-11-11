import type { FeedbackMessage, SendFeedbackRequest } from '@shelfmark/contracts';

/**
 * What the web app needs from the feedback message endpoints. `HttpFeedbackApi` talks to
 * `/api/feedback/messages`; the mock (development and e2e builds) keeps the messages in
 * `localStorage`.
 */
export interface FeedbackApi {
  /** `GET /api/feedback/messages`: the user's messages, newest first. */
  list(): Promise<FeedbackMessage[]>;
  /**
   * `POST /api/feedback/messages`: sends one message. Rejects with a `FeedbackSendError`
   * (`RateLimited` for a 429, `Failed` for everything else).
   */
  send(request: SendFeedbackRequest): Promise<FeedbackMessage>;
}
