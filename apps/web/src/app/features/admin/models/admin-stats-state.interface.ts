import type { AdminStatsResponse } from '@shelfmark/contracts';
import type { FeedbackLoadState } from '../../feedback/models/feedback-load-state.type';

export interface AdminStatsState {
  /** The last answer; kept while a refresh runs, so the page does not blank out. */
  stats: AdminStatsResponse | null;
  phase: FeedbackLoadState;
}
