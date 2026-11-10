import type { FeedbackStatus } from '@shelfmark/contracts';

/** Body of `PATCH /api/admin/feedback/:id`; a field that is left out stays as it is. */
export interface UpdateAdminFeedbackRequest {
  status?: FeedbackStatus;
  /** The answer, at most `FEEDBACK_MESSAGE_LIMIT.TextMax` characters; `null` clears it. */
  reply?: string | null;
}
