/** Where the reorder line goes, in px from the list's top-left corner (its border box). */
export interface ReorderDropLine {
  /** The centre of the gap where the row lands. */
  readonly top: number;
  /** The left edge of the neighbouring row's own background. */
  readonly left: number;
  /** The width of that background. */
  readonly width: number;
}
