import type { FeedbackMessage } from '../feedback/feedback-message.interface';
import type { AdminFeedbackUser } from './admin-feedback-user.interface';

/** A feedback message of any user; `screenshotUrl` points to the admin screenshot route. */
export interface AdminFeedbackItem extends FeedbackMessage {
  user: AdminFeedbackUser;
}
