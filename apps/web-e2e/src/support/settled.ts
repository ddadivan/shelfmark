import { type Page } from '@playwright/test';

/** Waits for the enter animations and the fonts: axe measures contrast on the painted colors. */
export async function settled(page: Page): Promise<void> {
  // String script: this project has no DOM lib, and the code runs in the browser anyway.
  // Scroll-driven animations (the phone header shadow) have no time-based end: skip them. A paused
  // animation (an Undo toast's countdown under the pointer) never ends on its own: skip it too. So
  // does one on an element the browser does not render (`content-visibility: auto` cards off
  // screen): its `finished` promise can stay pending for good.
  // The wait is capped at 5 s: an animation the browser stops updating must not hang the test.
  await page.evaluate(
    'Promise.race([new Promise((done) => setTimeout(done, 5000)), Promise.all([document.fonts.ready, ...document.getAnimations().filter((a) => a.timeline === document.timeline && a.playState !== "paused" && a.effect?.getComputedTiming().iterations !== Infinity && (a.effect?.target?.checkVisibility?.({ contentVisibilityAuto: true }) ?? true)).map((a) => a.finished.catch(() => undefined))])])',
  );
}
