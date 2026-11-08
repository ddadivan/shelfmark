import type { FeedbackMilestone } from '@shelfmark/contracts';
import type { MockRatingEntry } from './mock-rating-entry.interface';

/** What the mock keeps in `localStorage`: the sign-up time and the answers. */
export interface MockRatingState {
  /** ISO time of the sign-up; set at the first prompt when missing, so nothing is due at once. */
  createdAt?: string;
  entries: Partial<Record<FeedbackMilestone, MockRatingEntry>>;
}
