/** What "Sort with AI" or the user's own choice decided for one tab, as the batch needs it. */
export interface BatchItemPick {
  /** The draft asked for this tab. */
  draftId: string | null;
  /** This tab's own folder (AI's, or the user's pick for the link); `null` = the batch folder. */
  folderId: string | null;
  /** Tag names AI picked for this tab, `[]` for none. */
  tags: readonly string[];
}
