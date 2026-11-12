/** What `LinkActionsService` (one link) and `BulkLinkActionsService` (a selection) hand to the move picker. */
export interface MovePickerData {
  /** The translated title: "Move “Wool coat”" or "Move 3 links". */
  readonly heading: string;
  /**
   * Folders the links are in now (`null` = Unsorted): marked "Current folder" and not choosable.
   * Empty for a selection from several folders, where any target is a move.
   */
  readonly currentIds: readonly (string | null)[];
  /** Called at once with the chosen folder (`null` = Unsorted); the picker closes right after. */
  readonly submit: (folderId: string | null) => void;
}
