/** Body and headers of the final response of a fetch, before decoding. */
export interface RawResponse {
  status: number;
  /** Media type without parameters, lower case. */
  contentType: string;
  /** The full `Content-Type` header (charset detection). */
  contentTypeHeader: string;
  bytes: Buffer;
}
