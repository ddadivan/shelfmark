/** `POST /api/ai/view-draft` body (#535). */
export interface ViewDraftRequest {
  /** What the view should show, in the user's words: `VIEW_DRAFT_LIMIT.PhraseMin` to `PhraseMax` characters after trimming. */
  phrase: string;
}
