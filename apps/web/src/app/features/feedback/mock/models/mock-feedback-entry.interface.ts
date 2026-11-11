import { type AdminFeedbackItem } from '@shelfmark/contracts';

/** One stored mock message and the user it belongs to. */
export interface MockFeedbackEntry {
  userId: string;
  message: AdminFeedbackItem;
}
