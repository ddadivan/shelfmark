import type { AdminFeedbackItem } from './admin-feedback-item.interface';

/** `GET /api/admin/feedback`: newest first, `nextCursor` is `null` on the last page. */
export interface ListAdminFeedbackResponse {
  items: AdminFeedbackItem[];
  nextCursor: string | null;
}
