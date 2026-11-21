/** The two response headers that decide whether a page may be framed (`SafeHeadersResult`). */
export interface FramingHeaders {
  xFrameOptions: string | null;
  /** All `Content-Security-Policy` headers, joined by a comma. */
  contentSecurityPolicy: string | null;
}
