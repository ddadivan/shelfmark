import type { FeedbackMessage } from '../feedback/feedback-message.interface';
import type { AdminFeedbackUser } from './admin-feedback-user.interface';

/** A feedback message of any user; `screenshotUrls` point to the admin screenshot route. */
export interface AdminFeedbackItem extends FeedbackMessage {
  user: AdminFeedbackUser;
}
