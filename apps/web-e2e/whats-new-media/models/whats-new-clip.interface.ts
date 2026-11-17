/**
 * Where the crop of a screenshot starts, in CSS pixels of the page. Without a size the crop is
 * `WHATS_NEW_MEDIA.crop`; a larger one is scaled down to the same image size.
 */
export interface WhatsNewClip {
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
}
