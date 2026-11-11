/** State of `LinkSelectionStore`. */
export interface LinkSelectionState {
  /** Selected link ids in the order they were picked (no duplicates). */
  ids: readonly string[];
  /** The last link toggled on its own: the start of a Shift-click range. */
  anchor: string | null;
}
