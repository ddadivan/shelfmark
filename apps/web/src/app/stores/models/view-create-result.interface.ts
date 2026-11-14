import type { SavedViewResponse } from '@shelfmark/contracts';
import type { ViewOutcome } from './view-outcome.type';

/** Result of creating a saved view; `view` is the created one when `outcome` is `Done`. */
export interface ViewCreateResult {
  readonly outcome: ViewOutcome;
  readonly view?: SavedViewResponse;
}
