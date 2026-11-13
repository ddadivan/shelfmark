/** One of the three numbers of the "Your shelf" card (links, folders, tags). */
export interface ShelfCount {
  /** Translation key of the label. */
  readonly labelKey: string;
  /** The number, grouped for the active language. */
  readonly value: string;
}
