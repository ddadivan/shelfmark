/**
 * A short silent loop (3–5 s) of the most visual feature of a release, shown in the "What's new"
 * card instead of its image: muted, `playsinline`, lazy, the poster only under reduced motion.
 * Same-origin files under `public/media/whats-new/` (CSP).
 */
export interface ChangelogVideo {
  /** Path from the site root of the clip (`.mp4`). */
  readonly src: string;
  /** Path from the site root of the poster frame (`.webp`), shown before playing and under reduced motion. */
  readonly poster: string;
  /** Intrinsic size of the clip and its poster, so the card keeps its layout. */
  readonly width: number;
  readonly height: number;
}
