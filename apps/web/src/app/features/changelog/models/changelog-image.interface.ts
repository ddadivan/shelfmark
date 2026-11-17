/**
 * A screenshot of a feature: same-origin files under `public/media/whats-new/<version>/` (CSP), one
 * per theme, with the intrinsic size so the page keeps its layout. Made by the
 * `web-e2e:whats-new-media` generator (apps/web/CLAUDE.md).
 */
export interface ChangelogImage {
  /** Path from the site root of the light theme file, e.g. `/media/whats-new/2.1.0/side-by-side-light.webp`. */
  readonly light: string;
  /** Path from the site root of the dark theme file. */
  readonly dark: string;
  readonly width: number;
  readonly height: number;
  /** Translation key of the alt text: what the screenshot shows. */
  readonly altKey: string;
}
