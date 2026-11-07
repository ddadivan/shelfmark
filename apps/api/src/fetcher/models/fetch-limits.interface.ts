export interface FetchLimits {
  /** Maximum number of redirect hops that are followed. */
  maxRedirects: number;
  /** Time allowed to establish the TCP connection of one hop. */
  connectTimeoutMs: number;
  /** Time allowed for the whole fetch, all hops and the body included. */
  totalTimeoutMs: number;
  /** Maximum response body size; the stream is aborted beyond it. */
  maxBodyBytes: number;
  /** Maximum length of the requested URL. */
  maxUrlLength: number;
}
