/** A row of the folder tree in the "Folders inside folders" tile. */
export interface LandingBentoFolder {
  /** Translation key of the folder name. */
  readonly nameKey: string;
  /** How many links the example folder holds. */
  readonly count: number;
  /** Nesting level, 0 for a top-level folder. */
  readonly depth: number;
  /** The selected row. */
  readonly active: boolean;
}
