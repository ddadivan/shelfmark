/** A run of the text; `match` is true when a query term covers it. */
export interface HighlightPart {
  readonly text: string;
  readonly match: boolean;
}
