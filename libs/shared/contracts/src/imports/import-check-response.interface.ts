/** `POST /api/imports/check` response. */
export interface ImportCheckResponse {
  /** Indexes into `urls` whose normalised URL matches one of the user's live links, ascending. */
  saved: number[];
  /** How many more links fit the user's link limit (the demo limit in a demo sandbox) right now. */
  room: number;
}
