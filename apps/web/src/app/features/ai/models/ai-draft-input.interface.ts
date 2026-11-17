/** What Add link hands to `AiDraftService` once the preview has loaded. */
export interface AiDraftInput {
  /** The address as it will be saved. */
  url: string;
  /** The preview's title, when the page was fetched. */
  title?: string;
  /** The preview's description, when there is one. */
  description?: string;
  /** The note typed so far; sent only while "Include my notes" is on. */
  note?: string;
}
