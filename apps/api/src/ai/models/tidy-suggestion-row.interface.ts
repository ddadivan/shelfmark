/** A stored `suggested` row of a link as Tidy reads it. */
export interface TidySuggestionRow {
  id: string;
  kind: string;
  tagName: string | null;
  folderId: string | null;
}
