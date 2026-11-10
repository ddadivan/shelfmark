import type { AdminFeedbackMessage } from './admin-feedback-message.interface';

/** One page of the admin inbox, newest first. */
export interface AdminFeedbackPage {
  items: AdminFeedbackMessage[];
  /** Pass it as `cursor` for the next page; `null` on the last page. */
  nextCursor: string | null;
}
