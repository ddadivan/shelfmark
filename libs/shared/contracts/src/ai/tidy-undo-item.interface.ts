/** What a Tidy run actually changed on one link (returned by apply, sent back by Undo). */
export interface TidyUndoItem {
  linkId: string;
  /** The folder the run set, or `null` when it did not move the link. */
  folderId: string | null;
  /** Tag names the run added. */
  tags: string[];
  /** Suggestion ids the run marked accepted. */
  suggestionIds: string[];
}
