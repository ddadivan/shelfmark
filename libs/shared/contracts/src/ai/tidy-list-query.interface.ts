/**
 * `GET /api/ai/tidy?after=<linkId>`: the next page starts after this link of the previous page
 * (newest first), so links the user skipped or left as they were do not hold the page. Without it,
 * or when it is not one of the user's links, the list starts at the newest.
 */
export interface TidyListQuery {
  after?: string;
}
