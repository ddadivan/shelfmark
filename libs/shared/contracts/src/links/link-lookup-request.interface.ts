/**
 * `POST /api/links/lookup` body (#445, the browser extension): is this URL already in the library?
 * A body, not a query string, so the address never lands in request logs.
 */
export interface LinkLookupRequest {
  /** http(s) URL, at most `LINK_LIMIT.UrlMax` characters. */
  url: string;
}
