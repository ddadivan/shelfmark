import type { AdminFeedbackMessage } from '../../../admin/models/admin-feedback-message.interface';

/** One stored mock message and the user it belongs to. */
export interface MockFeedbackEntry {
  userId: string;
  message: AdminFeedbackMessage;
}
