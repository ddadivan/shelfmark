import type { LandingFolder } from './landing-folder.type';
import type { LandingImage } from './landing-image.interface';
import type { LandingPreviewKind } from './landing-preview-kind.type';

/** One link card of the hero's app preview (`landing.hero.preview.items.<id>`). */
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
}
