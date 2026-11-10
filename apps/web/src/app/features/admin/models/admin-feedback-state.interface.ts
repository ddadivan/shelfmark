import type { FeedbackStatus } from '@shelfmark/contracts';
import type { FeedbackLoadState } from '../../feedback/models/feedback-load-state.type';
import { type AdminFeedbackItem } from '@shelfmark/contracts';

export interface AdminFeedbackState {
  items: AdminFeedbackItem[];
  phase: FeedbackLoadState;
  /** Cursor of the next page, or `null` when everything is loaded. */
  nextCursor: string | null;
  /** The next page is being fetched. */
  loadingMore: boolean;
  /** Show only this status; `null` shows all. */
  filter: FeedbackStatus | null;
}
