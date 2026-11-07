/** A row of the folder tree in the "after" scene. */
export interface LandingTreeRow {
  readonly id: string;
  /** Translation key of the folder name. */
  readonly nameKey: string;
  /** Nesting level, 0 for a top-level folder. */
  readonly depth: number;
}
