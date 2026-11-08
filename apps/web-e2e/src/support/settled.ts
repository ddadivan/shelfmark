import { type Page } from '@playwright/test';

/** Waits for the enter animations and the fonts: axe measures contrast on the painted colors. */
export async function settled(page: Page): Promise<void> {
  // String script: this project has no DOM lib, and the code runs in the browser anyway.
  await page.evaluate(
    'Promise.all([document.fonts.ready, ...document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))])',
  );
}
