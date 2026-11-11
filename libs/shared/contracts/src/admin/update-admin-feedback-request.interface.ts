import type { FeedbackStatus } from '../feedback/feedback-status.type';

/** `PATCH /api/admin/feedback/:id`; answers `AdminFeedbackItem`. At least one key. */
export interface UpdateAdminFeedbackRequest {
  status?: FeedbackStatus;
  /** Up to `ADMIN_FEEDBACK_LIMIT.ReplyMax` characters; `null` clears the reply. */
  reply?: string | null;
}
