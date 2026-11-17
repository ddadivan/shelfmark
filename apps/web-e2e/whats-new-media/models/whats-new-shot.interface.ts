import type { Page } from '@playwright/test';
import type { WhatsNewClip } from './whats-new-clip.interface';

/** One screenshot of a New item: gets the page ready and says where to crop. */
export interface WhatsNewShot {
  /** File name stem: `<slug>-light.webp` and `<slug>-dark.webp`; also the item id in the changelog. */
  readonly slug: string;
  /** Opens the screen with its mock data and returns the crop. */
  readonly prepare: (page: Page) => Promise<WhatsNewClip>;
}
