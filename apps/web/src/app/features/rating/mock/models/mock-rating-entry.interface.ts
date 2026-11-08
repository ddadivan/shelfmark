import type { FeedbackScore } from '@shelfmark/contracts';

/** One answered milestone in the mock's storage. */
export interface MockRatingEntry {
  /** `null` is a skip. */
  score: FeedbackScore | null;
  comment?: string;
}
