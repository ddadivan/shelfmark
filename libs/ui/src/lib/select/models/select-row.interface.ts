/** One visible line of the listbox: the tree flattened in order, with its depth. */
export interface SelectRow {
  /** Option id, or `null` for the empty-value row. */
  readonly id: string | null;
  readonly name: string;
  /** Names from the root, for example `Work / Angular`; the accessible name of nested rows. */
  readonly path: string;
  /** Depth; 0 for the root and the empty-value row. */
  readonly level: number;
}
