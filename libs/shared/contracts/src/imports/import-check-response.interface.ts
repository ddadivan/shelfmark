/** `POST /api/imports/check` response. */
export interface ImportCheckResponse {
  /** Indexes into `urls` whose normalised URL matches one of the user's live links, ascending. */
  saved: number[];
}
