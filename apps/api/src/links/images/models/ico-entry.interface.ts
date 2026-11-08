/** One directory entry of an ICO file. */
export interface IcoEntry {
  width: number;
  height: number;
  /** Bits per pixel (0 when the file does not say). */
  depth: number;
  offset: number;
  size: number;
}
