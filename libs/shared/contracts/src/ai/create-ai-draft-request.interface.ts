/**
 * `POST /api/ai/drafts` body, sent by Add link once the preview has loaded. The save sends the same
 * `draftId` as `CreateLinkRequest.aiDraftId` to pick up the result.
 */
export interface CreateAiDraftRequest {
  /** Client-generated UUID, one per Add link dialog; a repeat returns the same job. */
  draftId: string;
  /** http(s) URL, at most `LINK_LIMIT.UrlMax`. */
  url: string;
  /** From the preview; at most `LINK_LIMIT.TitleMax`. */
  title?: string;
  /** From the preview. */
  description?: string;
  /** Sent to the model only while "Include my notes" is on; at most `LINK_LIMIT.NoteMax`. */
  note?: string;
}
