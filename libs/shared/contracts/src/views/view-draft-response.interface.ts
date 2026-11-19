import type { AskAllowance } from '../ai/ask-allowance.interface';
import type { ViewDraftOutcome } from './view-draft-outcome.type';
import type { ViewDraft } from './view-draft.interface';

/** `POST /api/ai/view-draft` answer (#535): always 200 once AI is on and the phrase is valid. */
export interface ViewDraftResponse {
  outcome: ViewDraftOutcome;
  /** Set exactly when `outcome` is `done`. */
  draft: ViewDraft | null;
  /** Ask questions left after this request (a phrase counts as one question). */
  allowance: AskAllowance;
}
