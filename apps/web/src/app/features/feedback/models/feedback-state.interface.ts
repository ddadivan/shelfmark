import type { FeedbackMessage } from '@shelfmark/contracts';
import type { FeedbackLoadState } from './feedback-load-state.type';

export interface FeedbackState {
  items: FeedbackMessage[];
  phase: FeedbackLoadState;
}
