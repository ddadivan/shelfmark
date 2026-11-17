/** A stored suggestion of a link, as the apply step compares it. */
export interface SuggestionRow {
  id: string;
  kind: string;
  tagName: string | null;
  folderId: string | null;
  state: string;
}
