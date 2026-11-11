/** What `LinkActionsService` (one link) and `BulkLinkActionsService` (a selection) hand to the move dialog. */
export interface MoveLinkDialogData {
  /** The translated dialog title: "Move “Wool coat”" or "Move 3 links". */
  readonly heading: string;
  /** The folder preselected in the picker (`null` = Unsorted). */
  readonly folderId: string | null;
  /**
   * Called with the chosen folder (`null` = Unsorted). For one link only when it differs from
   * `folderId`; with `submitUnchanged` (a selection from several folders) always.
   */
  readonly submit: (folderId: string | null) => void;
  readonly submitUnchanged?: boolean;
}
