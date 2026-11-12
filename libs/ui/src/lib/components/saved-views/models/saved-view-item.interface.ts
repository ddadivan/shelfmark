/** One chip of `ui-saved-views`. Every visible string comes from the feature (translated). */
export interface SavedViewItem {
  id: string;
  label: string;
  /** Shown after the label in tabular numbers; `null` hides it (not loaded yet). */
  count: number | null;
  /** Accessible name of the chip's "…" button ("Actions for Videos"); the button renders only when set. */
  menuLabel?: string;
  /** Tooltip (and description) of the chip: what it filters, for example "Links detected as videos". */
  hint?: string;
}
