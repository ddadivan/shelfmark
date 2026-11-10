import type { FeedbackMessage } from '@shelfmark/contracts';
import type { AdminFeedbackUser } from './admin-feedback-user.interface';

/** A feedback message in the admin inbox: the user's view plus who sent it. */
export interface AdminFeedbackMessage extends FeedbackMessage {
  user: AdminFeedbackUser;
}
