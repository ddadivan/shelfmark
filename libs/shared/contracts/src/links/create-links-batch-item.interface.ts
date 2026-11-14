/** One link of `POST /api/links/batch`. */
export interface CreateLinksBatchItem {
  /** http(s) URL, at most `LINK_LIMIT.UrlMax` characters. */
  url: string;
  /**
   * At most `LINK_LIMIT.TitleMax`; usually the title of a preview the client already loaded. Absent:
   * the URL for now, and the lazy image capture fills in the page title later (the batch request
   * itself never fetches a page).
   */
  title?: string;
  /**
   * Client-generated UUID, one per link and dialog session, unique within the batch. A retried batch
   * replays the links of known keys instead of creating copies (ADR 0033, per item).
   */
  idempotencyKey: string;
  /** Source hint (http(s), at most `LINK_LIMIT.UrlMax`) from a loaded preview; fetched later by the capture. */
  faviconUrl?: string;
  /** Source hint (http(s), at most `LINK_LIMIT.UrlMax`) from a loaded preview; fetched later by the capture. */
  imageUrl?: string;
}
