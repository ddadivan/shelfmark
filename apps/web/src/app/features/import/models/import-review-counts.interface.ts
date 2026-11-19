/** The numbers of the review step. */
export interface ImportReviewCounts {
  readonly links: number;
  readonly folders: number;
  /** Already on the shelf (live links with the same normalised URL). */
  readonly saved: number;
  /** Repeats of an earlier link of the same file. */
  readonly repeats: number;
}
