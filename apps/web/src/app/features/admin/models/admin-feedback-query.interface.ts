import type { FeedbackStatus } from '@shelfmark/contracts';

/** Query of `GET /api/admin/feedback`. */
export interface AdminFeedbackQuery {
  cursor?: string;
  limit?: number;
  /** Only messages with this status; omitted for all. */
  status?: FeedbackStatus;
}
