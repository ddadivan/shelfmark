/** Data of the phone's Conversations sheet. */
export interface AskHistorySheetData {
  /** The conversation on screen (its row is current). */
  readonly activeId: string | null;
  /** A conversation (an id) or all of them (no id) were deleted. */
  readonly removed: (id?: string) => void;
}
