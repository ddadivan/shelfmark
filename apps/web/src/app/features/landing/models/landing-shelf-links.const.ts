import { LANDING_IMAGES } from './landing-images.const';
import type { LandingShelfLink } from './landing-shelf-link.interface';

/** The Shopping folder of the "after" shelf, in order. */
export const LANDING_SHELF_LINKS: readonly LandingShelfLink[] = [
  { id: 'jacket', image: LANDING_IMAGES.jacket },
  { id: 'runners', image: LANDING_IMAGES.runners },
  { id: 'shirt', image: LANDING_IMAGES.shirt },
  { id: 'dasher', image: LANDING_IMAGES.dasher },
];
