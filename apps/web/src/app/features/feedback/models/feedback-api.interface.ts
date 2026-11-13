import type {
  FeedbackMessage,
  FeedbackScreenshotUpload,
  SendFeedbackRequest,
} from '@shelfmark/contracts';

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
  /**
   * `POST feedbackScreenshotsPath(id)`: attaches one screenshot to a message just sent and
   * answers the updated message. Rejects with the `HttpErrorResponse` (400 with the contract
   * message, 404).
   */
  attachScreenshot(id: string, upload: FeedbackScreenshotUpload): Promise<FeedbackMessage>;
}
