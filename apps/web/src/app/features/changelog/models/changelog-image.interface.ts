/**
 * A picture of a feature in the "What's new" card: a same-origin file under
 * `public/media/whats-new/` (CSP), with its intrinsic size so the card keeps its layout.
 */
export interface ChangelogImage {
  /** Path from the site root, e.g. `/media/whats-new/2.1.0-side-by-side.webp`. */
  readonly src: string;
  readonly width: number;
  readonly height: number;
}
