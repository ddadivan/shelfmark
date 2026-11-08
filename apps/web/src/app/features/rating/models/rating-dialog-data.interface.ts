import type { WritableSignal } from '@angular/core';
import type { FeedbackMilestone } from '@shelfmark/contracts';

/** What `RatingStore` hands to the dialog. */
export interface RatingDialogData {
  readonly milestone: FeedbackMilestone;
  /**
   * Set by the dialog once the user picked a score (and back to false when saving it failed).
   * Closing the dialog without one (Not now, Esc, scrim) is recorded as a skip by the store.
   */
  readonly scored: WritableSignal<boolean>;
}
