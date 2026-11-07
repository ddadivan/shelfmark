/** `POST /api/links/preview` body. */
export interface LinkPreviewRequest {
  /** http(s) URL, at most `LINK_LIMIT.UrlMax` characters. */
  url: string;
}
