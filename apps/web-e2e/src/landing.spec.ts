import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { LANDING_HEADLINE } from './models/landing-headline.const';
import { gotoLandingLoaded } from './support/landing';
import { settled } from './support/settled';
import { E2E_TAG } from './models/e2e-tag.const';

test.describe('landing', () => {
  test(
    'a guest sees the headline and the sections in order',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
      // Auto-waits: the sections below the hero are deferred (on idle).
      await expect(page.getByRole('heading', { level: 2 })).toHaveText([
        'Save once, find in seconds',
        'The same links, before and after',
        'Why this exists',
        "How it's built",
        'Empty your Saved Messages.',
      ]);
    },
  );

  test('"How it works" in the header scrolls to and focuses the section', async ({ page }) => {
    // The header links are hidden on a phone by design (sign-in stays), so use a desktop width.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();

    // Straight away, possibly before the deferred sections are idle-loaded.
    await page.getByRole('banner').getByRole('link', { name: 'How it works' }).click();

    const section = page.getByRole('region', { name: 'Save once, find in seconds' });
    await expect(section).toBeInViewport();
    await expect(section).toBeFocused();
  });

  test('opening the page with #how scrolls to and focuses the section', async ({ page }) => {
    await page.goto('/#how');

    const section = page.getByRole('region', { name: "How it's built" });
    await expect(section).toBeInViewport();
    await expect(section).toBeFocused();

    // Settled: every deferred block (the footer comes last) is in, and the target did not move.
    await expect(page.getByRole('contentinfo')).toBeAttached();
    await expect(section).toBeInViewport();
    await expect(section).toBeFocused();
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    test(`the first screen fills a ${viewport.width}x${viewport.height} window`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();
      await expect(page.locator('.landing-hero-preview')).toBeVisible();

      const hero = await page.locator('.landing-hero').boundingBox();
      const header = await page.locator('.landing-header').boundingBox();
      if (!hero || !header) {
        throw new Error('The header or the hero has no box');
      }
      // Header + hero are the window tall (never shorter); the content is bigger than the old column.
      expect(header.y + header.height + hero.height).toBeGreaterThanOrEqual(viewport.height - 1);
      expect(hero.y + hero.height).toBeLessThanOrEqual(viewport.height * 1.1);
      const title = await page.locator('.landing-hero__title').boundingBox();
      expect(title?.width).toBeGreaterThan(viewport.width * 0.3);
      const overflow = await page.evaluate<number>(
        '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  for (const width of [360, 800, 1280]) {
    test(`the header has its final height from the first frame at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(`
        window.__heights = [];
        const sample = () => {
          const header = document.querySelector('header');
          if (header) window.__heights.push(header.getBoundingClientRect().height);
          if (window.__heights.length < 120) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      `);

      await gotoLandingLoaded(page);

      const heights = await page.evaluate<number[]>('window.__heights');
      expect(heights.length).toBeGreaterThan(0);
      expect(new Set(heights).size, JSON.stringify(heights)).toBe(1);
    });
  }

  test('the hero headline has its text in the first frame it is rendered', async ({ page }) => {
    // Plain script (as elsewhere in this suite): the e2e project has no DOM typings.
    await page.addInitScript(`
      window.__firstHero = null;
      const sample = () => {
        const title = document.querySelector('.landing-hero__title');
        if (title) {
          window.__firstHero = (title.textContent || '').trim();
        } else {
          requestAnimationFrame(sample);
        }
      };
      requestAnimationFrame(sample);
    `);

    await gotoLandingLoaded(page);

    const firstHero = await page.evaluate<string | null>('window.__firstHero');
    expect(firstHero, 'the headline never rendered').not.toBeNull();
    expect(firstHero).toBe(LANDING_HEADLINE);
  });

  for (const width of [360, 800, 1280]) {
    test(`the app preview and the deferred sections shift nothing at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      // Plain scripts (as elsewhere in this suite): the e2e project has no DOM typings.
      await page.addInitScript(`
        window.__shifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            const where = (s) => s.node ? s.node.nodeName + '.' + (s.node.className || s.node.parentElement?.className || '') : '?';
            window.__shifts.push({
              at: Math.round(entry.startTime),
              value: entry.value,
              sources: entry.sources.map((s) => ({
                node: where(s),
                from: s.previousRect.y + '+' + s.previousRect.height,
                to: s.currentRect.y + '+' + s.currentRect.height,
              })),
            });
          }
        }).observe({ type: 'layout-shift', buffered: true });
      `);

      await gotoLandingLoaded(page);
      // The preview's cards land and its toast slides in after the headline: wait for the last
      // part to finish, then for the page to settle.
      await expect(page.locator('.landing-hero-preview__toast')).toHaveCSS('opacity', '1');
      await settled(page);

      // The sources go into the failure message, so a CI failure says what moved.
      const shifts = await page.evaluate<{ at: number; value: number }[]>('window.__shifts');
      const total = shifts.reduce((sum, shift) => sum + shift.value, 0);
      expect(total, JSON.stringify(shifts)).toBeLessThan(0.001);
    });
  }
});

test.describe('landing scenes and reveals', () => {
  test('the bento sits between the hero and the before and after, no overflow at 360px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await gotoLandingLoaded(page);
    const bento = page.getByRole('region', { name: 'Save once, find in seconds' });
    const before = page.getByRole('region', { name: 'The same links, before and after' });
    await bento.scrollIntoViewIfNeeded();

    const [b, a] = await Promise.all([bento.boundingBox(), before.boundingBox()]);
    expect(b?.y ?? 0).toBeLessThan(a?.y ?? 0);
    expect(b?.width ?? 999).toBeLessThanOrEqual(360);
    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the scattered board comes in, then floats on and holds still under the pointer', async ({
    page,
  }) => {
    await page.goto('/');
    const shelf = page.getByRole('region', { name: 'The same links, before and after' });
    await shelf.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const board = shelf.getByRole('img', { name: /scattered across Saved Messages/ });
    const states = (): Promise<string[]> =>
      board.evaluate((el) =>
        el
          .getAnimations({ subtree: true })
          .map((animation: { playState: string }) => animation.playState),
      );

    await expect(board.getByText('Bookmarks bar (91)')).toHaveCSS('opacity', '1');
    // The entrance is over, the endless float keeps running.
    await expect
      .poll(async () => (await states()).filter((state) => state === 'running').length, {
        timeout: 5000,
      })
      .toBeGreaterThanOrEqual(5);

    await shelf.locator('.landing-ba__scenes').hover();
    await expect
      .poll(async () => (await states()).filter((state) => state === 'running').length)
      .toBe(0);
    await page.mouse.move(0, 0);
    await expect
      .poll(async () => (await states()).filter((state) => state === 'running').length)
      .toBeGreaterThan(0);
  });
});

test.describe('landing app preview motion', () => {
  /**
   * Four cards in the DOM (a video and three articles); a row shows as many as fit at a readable
   * width, the others are off it (transparent).
   */
  const cards = (page: Page): Locator => page.locator('.landing-hero-preview__item');
  /** The cards on the row: opaque ones. */
  // String scripts: this project has no DOM lib, and the code runs in the browser anyway.
  const shownCards = (page: Page): Promise<string[]> =>
    page.evaluate<string[]>(
      "[...document.querySelectorAll('.landing-hero-preview__item')].filter((el) => getComputedStyle(el).opacity === '1').map((el) => el.querySelector('.link-preview-card__host')?.textContent.trim() ?? '')",
    );
  const toast = (page: Page): Locator => page.locator('.landing-hero-preview__toast');
  /** Animations still running inside the preview. */
  const running = (page: Page): Promise<number> =>
    page
      .locator('.landing-hero-preview')
      .evaluate(
        (el) =>
          el
            .getAnimations({ subtree: true })
            .filter((animation: { playState: string }) => animation.playState === 'running').length,
      );

  test('the cards land one after another, then the toast slides in, once', async ({ page }) => {
    await page.goto('/');
    await expect(cards(page)).toHaveCount(4);

    // The toast is the last to arrive: when it is done, every card is done.
    await expect(toast(page)).toHaveCSS('opacity', '1', { timeout: 5000 });
    await expect.poll(() => running(page)).toBe(0);
    expect((await shownCards(page)).length).toBeGreaterThan(0);
    // That it never lands again while the page stays open: landing-hero-preview.component.spec.ts.
    await expect(toast(page)).toContainText('Saved to Read later');
    await expect(toast(page)).toContainText('Undo');
  });
});

/**
 * Scrolls the page top to bottom in steps, so every section is seen by its reveal observer (an
 * off-screen section stays hidden until it scrolls in; there is no timeout that reveals it).
 */
async function scrollThrough(page: Page): Promise<void> {
  await page.evaluate(`(async () => {
    const root = document.scrollingElement ?? document.documentElement;
    for (let y = 0; y < root.scrollHeight; y += innerHeight / 2) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    scrollTo(0, root.scrollHeight);
  })()`);
}

/** Waits for the reveal transitions to end, so axe never reads half-transparent text. */
async function settleReveals(page: Page): Promise<void> {
  await expect(page.locator('.landing-reveal--pending')).toHaveCount(0);
  await page.evaluate(
    'Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished)).then(() => undefined)',
  );
}

// Desktop only: the phone layout has the same content (the header drops two links, see
// landing-header.component.spec.ts), and the smoke and mobile overflow checks cover 360px.
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 900 }] as const;

for (const colorScheme of Object.values(COLOR_SCHEME)) {
  for (const viewport of VIEWPORTS) {
    test.describe(`landing accessibility (${colorScheme}, ${viewport.name})`, () => {
      // The static frame: a scan in the middle of a fade or the folder cycle would read
      // half-transparent text, so these run without motion and stay deterministic.
      test.use({
        colorScheme,
        reducedMotion: 'reduce',
        viewport: { width: viewport.width, height: viewport.height },
      });

      test('the first screen has no serious or critical axe violations', async ({
        page,
      }, testInfo) => {
        await gotoLandingLoaded(page);
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo);
      });
    });

    test.describe(`landing accessibility, settled scenes (${colorScheme}, ${viewport.name})`, () => {
      test.use({ colorScheme, viewport: { width: viewport.width, height: viewport.height } });

      test('shelf and board on a settled frame (reduced motion) have no serious or critical axe violations', async ({
        page,
      }, testInfo) => {
        // The loops never end, so the scan runs on the static frame they leave under reduced motion.
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await gotoLandingLoaded(page);
        await scrollThrough(page);
        const shelf = page.getByRole('region', { name: 'The same links, before and after' });
        await shelf.scrollIntoViewIfNeeded();
        await settleReveals(page);
        await expect
          .poll(() => shelf.evaluate((el) => el.getAnimations({ subtree: true }).length))
          .toBe(0);
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo);
      });
    });
  }
}
