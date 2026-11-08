export interface SafeImageResult {
  /** URL of the response after all redirects. */
  finalUrl: string;
  status: number;
  /** Declared media type, lower case. Untrusted: decide the format from the bytes. */
  contentType: string;
  bytes: Buffer;
}
