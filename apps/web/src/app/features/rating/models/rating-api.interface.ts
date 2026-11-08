import type { FeedbackMilestone, RecordFeedbackRequest } from '@shelfmark/contracts';

/**
 * What the web app needs from the feedback endpoints. `HttpRatingApi` talks to `/api/feedback`;
 * the mock (development and e2e builds) keeps the answers in `localStorage`.
 */
export interface RatingApi {
  /** `GET /api/feedback/prompt`: the milestone to ask about now, or `null` when nothing is due. */
  prompt(): Promise<FeedbackMilestone | null>;
  /** `POST /api/feedback`: saves a score, a comment or a skip (`score: null`). */
  record(request: RecordFeedbackRequest): Promise<void>;
}
