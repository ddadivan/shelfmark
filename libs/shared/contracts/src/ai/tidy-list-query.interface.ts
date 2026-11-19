/**
 * `GET /api/ai/tidy?after=<linkId>`: the next page starts after this link of the previous page
 * (newest first), so links the user skipped or left as they were do not hold the page. Without it,
 * or when it is not one of the user's links, the list starts at the newest.
 */
export interface TidyListQuery {
  after?: string;
  /**
   * Limits the review to the links of this import (its AI pass, ADR 0056 decision 9), in any folder;
   * without it the review lists Unsorted. A foreign or unknown import lists nothing.
   */
  import?: string;
}
