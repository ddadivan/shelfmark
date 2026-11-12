/** A row of the suggestion list: an existing tag, or the "Create tag" row. */
export interface TagInputRow {
  /** Unique option value (`tag:<name>` or `create:<name>`). */
  readonly key: string;
  /** The tag that is added when the row is chosen. */
  readonly name: string;
  /** Visible text of the row. */
  readonly label: string;
  /** The "Create tag" row. */
  readonly create: boolean;
  /** Usage count text of an existing tag. */
  readonly countLabel?: string;
}
