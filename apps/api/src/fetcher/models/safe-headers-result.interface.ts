export interface SafeHeadersResult {
  /** URL of the response after all redirects. */
  finalUrl: string;
  status: number;
  headers: {
    xFrameOptions: string | null;
    /** All `Content-Security-Policy` headers, joined by a comma. */
    contentSecurityPolicy: string | null;
  };
}
