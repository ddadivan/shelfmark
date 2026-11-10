import type { FeedbackStatus } from '../feedback/feedback-status.type';

/** `GET /api/admin/feedback` query. */
export interface ListAdminFeedbackQuery {
  status?: FeedbackStatus;
  /** Opaque, from the previous page's `nextCursor`. */
  cursor?: string;
  /** 1 to 100, default 50. */
  limit?: number;
}
