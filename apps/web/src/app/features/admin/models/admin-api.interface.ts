import type { AdminFeedbackMessage } from './admin-feedback-message.interface';
import type { AdminFeedbackPage } from './admin-feedback-page.interface';
import type { AdminFeedbackQuery } from './admin-feedback-query.interface';
import type { UpdateAdminFeedbackRequest } from './update-admin-feedback-request.interface';

/**
 * What the web app needs from the admin endpoints. `HttpAdminApi` talks to `/api/admin`; the mock
 * (development and e2e builds) shares the feedback messages of the user mock.
 */
export interface AdminApi {
  /** `GET /api/admin/status`: true for the author (200), false for anyone else (404). */
  isAdmin(): Promise<boolean>;
  /** `GET /api/admin/feedback`: one page of all messages, newest first. */
  listFeedback(query: AdminFeedbackQuery): Promise<AdminFeedbackPage>;
  /** `PATCH /api/admin/feedback/:id`: sets the status and / or the reply; answers the message. */
  updateFeedback(id: string, request: UpdateAdminFeedbackRequest): Promise<AdminFeedbackMessage>;
}
