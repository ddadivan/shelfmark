import type { Page } from '@playwright/test';

/** One screenshot of a help article: opens the screen with its mock data. */
export interface HelpShot {
  /** File name stem: `<slug>-light.webp` and `<slug>-dark.webp`; the image block `keys[0]` of the article. */
  readonly slug: string;
  /** The article that shows it (for the README and the log). */
  readonly article: string;
  /** Gets the screen ready; the whole window is captured. */
  readonly prepare: (page: Page) => Promise<void>;
}
