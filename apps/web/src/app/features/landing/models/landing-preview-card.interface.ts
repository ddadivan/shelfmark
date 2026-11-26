import type { LandingFolder } from './landing-folder.type';
import type { LandingImage } from './landing-image.interface';
import type { LandingPreviewKind } from './landing-preview-kind.type';

/** One link card of the hero's app preview (`landing.preview.items.<id>`). */
export interface LandingPreviewCard {
  readonly id: string;
  readonly image: LandingImage;
  /** A product shot: shown whole on the soft fill instead of cropped. */
  readonly product: boolean;
  readonly kind: LandingPreviewKind;
  readonly folder: LandingFolder;
  readonly favorite: boolean;
  /** Has a note (`…items.<id>.note`). */
  readonly note: boolean;
  /** The site row: the host and the favicon's fallback letter and colour (`#rrggbb`). */
  readonly site: { readonly host: string; readonly letter: string; readonly colour: string };
  /** Hashtags (the person's own words, so not translated). */
  readonly tags: readonly string[];
}
