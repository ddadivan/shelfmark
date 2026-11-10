import type { FeedbackStatus } from '@shelfmark/contracts';
import type { FeedbackLoadState } from '../../feedback/models/feedback-load-state.type';
import type { AdminFeedbackMessage } from './admin-feedback-message.interface';

export interface AdminFeedbackState {
  items: AdminFeedbackMessage[];
  phase: FeedbackLoadState;
  /** Cursor of the next page, or `null` when everything is loaded. */
  nextCursor: string | null;
  /** The next page is being fetched. */
  loadingMore: boolean;
  /** Show only this status; `null` shows all. */
  filter: FeedbackStatus | null;
}
