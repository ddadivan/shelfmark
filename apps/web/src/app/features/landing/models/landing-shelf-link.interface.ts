import type { LandingImage } from './landing-image.interface';

/** One link row of the "after" shelf (`landing.beforeAfter.links.<id>`: title and note). */
export interface LandingShelfLink {
  readonly id: string;
  readonly image: LandingImage;
}
