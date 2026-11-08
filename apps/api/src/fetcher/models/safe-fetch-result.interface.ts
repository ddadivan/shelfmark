export interface SafeFetchResult {
  /** URL of the response after all redirects. */
  finalUrl: string;
  status: number;
  /** Media type without parameters, lower case. */
  contentType: string;
  /** Body decoded with the charset of the Content-Type header (UTF-8 by default). */
  body: string;
}
