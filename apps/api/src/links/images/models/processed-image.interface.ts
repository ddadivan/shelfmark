/** A re-encoded image, ready to store. */
export interface ProcessedImage {
  bytes: Buffer;
  contentType: string;
  width: number;
  height: number;
  sha256: string;
}
