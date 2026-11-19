/** The columns of a `link_suggestions` row that a client sees. */
export interface SuggestionRowOut {
  id: string;
  kind: string;
  state: string;
  tagName: string | null;
  folderId: string | null;
  more?: boolean;
}
