import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { LANDING_HEADLINE } from './models/landing-headline.const';
import { gotoLandingLoaded } from './support/landing';

test.describe('landing', () => {
  test('a guest sees the headline and the sections in order', async ({ page }) => {
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
  });

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

  test('the header offers "Privacy", "Sign in" and "Get started"', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const header = page.getByRole('banner');

    await expect(header.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    await expect(header.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
    await expect(header.getByRole('link', { name: 'Get started' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    await header.getByRole('link', { name: 'Privacy' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
  });

  test('the first screen has the mockup copy, the buttons and the note', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.landing-hero');

    await expect(hero).toContainText('on one calm shelf instead of chats and open tabs.');
    await expect(hero.getByRole('link', { name: 'Start your shelf' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    await expect(hero.getByRole('link', { name: 'Open the demo' })).toHaveAttribute(
      'href',
      '/demo',
    );
    await expect(hero.getByText('Sign in with Google or GitHub.')).toBeVisible();
    await expect(page.getByText('Saved Messages', { exact: true })).toHaveCount(0);
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
      await page.waitForTimeout(500);

      // The sources go into the failure message, so a CI failure says what moved.
      const shifts = await page.evaluate<{ at: number; value: number }[]>('window.__shifts');
      const total = shifts.reduce((sum, shift) => sum + shift.value, 0);
      expect(total, JSON.stringify(shifts)).toBeLessThan(0.001);
    });
  }

  test('"How it\'s built" links to the repository and decision log in new tabs', async ({
    page,
  }) => {
    await page.goto('/');

    const code = page.getByRole('link', { name: /Read the code on GitHub/ });
    const decisions = page.getByRole('link', { name: /Read the decision log/ });

    await expect(code).toHaveAttribute('href', 'https://github.com/ddadivan/shelfmark');
    await expect(decisions).toHaveAttribute('href', /\/docs\/adr$/);
    for (const link of [code, decisions]) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
  });

  test('the call-to-action buttons point to sign-in and the demo', async ({ page }) => {
    await page.goto('/');
    const finale = page.getByRole('region', { name: 'Empty your Saved Messages.' });

    await expect(finale.getByRole('link', { name: 'Open the demo' })).toHaveAttribute(
      'href',
      '/demo',
    );
    await expect(finale.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
  });

  test('the header sign-in link opens the sign-in page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('has no horizontal scroll at 360px width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await gotoLandingLoaded(page);

    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.locator('.landing-hero-preview__toast')).toBeVisible();
  });
});

test.describe('landing scenes and reveals', () => {
  test('the bento "Save once, find in seconds" shows five tiles and fits the width', async ({
    page,
  }) => {
    await page.goto('/');
    const bento = page.getByRole('region', { name: 'Save once, find in seconds' });

    await bento.scrollIntoViewIfNeeded();

    await expect(bento.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(bento.getByRole('heading', { level: 3 })).toHaveText([
      'The preview fills in by itself',
      'Folders inside folders',
      'Find it by any word',
      'Save from your phone',
      'Your links stay yours',
    ]);
    // The tiles fade in once scrolled to and end fully visible.
    await expect(bento.locator('.landing-bento__tile').first()).toHaveCSS('opacity', '1');
    await expect(bento.locator('.landing-bento__tile').last()).toHaveCSS('opacity', '1');
    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

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

  test('sections below the first screen are visible after scrolling to them', async ({ page }) => {
    await page.goto('/');
    const finale = page.getByRole('region', { name: 'Empty your Saved Messages.' });

    await finale.scrollIntoViewIfNeeded();

    await expect(finale.getByRole('link', { name: 'Open the demo' })).toBeVisible();
    await expect(finale.locator('h2')).toHaveCSS('opacity', '1');
    // The sections are tall now: the one above the finale is not on screen yet on a phone.
    await page.getByRole('region', { name: 'Why this exists' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('region', { name: 'Why this exists' }).locator('h2')).toHaveCSS(
      'opacity',
      '1',
    );
  });

  test('the shelf keeps cycling past one full pass, with no pause control', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    const shelf = page.getByRole('region', { name: 'The same links, before and after' });
    await shelf.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const activeRow = shelf.getByTestId('landing-ba-active-row');

    // Clothes, Angular, Recipes, Clothes again and on to Angular (3 s each).
    await expect(activeRow).toHaveText('Angular', { timeout: 15_000 });
    await expect(activeRow).toHaveText('Recipes', { timeout: 6000 });
    await expect(activeRow).toHaveText('Clothes', { timeout: 6000 });
    await expect(activeRow).toHaveText('Angular', { timeout: 6000 });
    await expect(shelf.getByRole('button')).toHaveCount(0);
  });

  test('the shelf pauses while the pointer is over the section and resumes after', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    const shelf = page.getByRole('region', { name: 'The same links, before and after' });
    await shelf.scrollIntoViewIfNeeded();
    const activeRow = shelf.getByTestId('landing-ba-active-row');
    await expect(activeRow).toHaveText('Angular', { timeout: 15_000 });

    await shelf.locator('.landing-ba__scenes').hover();
    const held = await activeRow.textContent();
    await page.waitForTimeout(4000);
    await expect(activeRow).toHaveText(held ?? '');

    await page.mouse.move(0, 0);
    await expect(activeRow).not.toHaveText(held ?? '', { timeout: 6000 });
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

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('shows the static final frame with everything visible and no pause control', async ({
      page,
    }) => {
      await page.goto('/');
      const shelf = page.getByRole('region', { name: 'The same links, before and after' });

      await expect(shelf.locator('h2')).toHaveCSS('opacity', '1');
      await expect(shelf.getByRole('button', { name: 'Pause animations' })).toHaveCount(0);
      await expect(page.getByRole('region', { name: 'Empty your Saved Messages.' })).toBeVisible();
      await expect(
        page.getByRole('region', { name: 'Empty your Saved Messages.' }).locator('h2'),
      ).toHaveCSS('opacity', '1');

      await shelf.scrollIntoViewIfNeeded();
      await page.waitForTimeout(3500);
      await expect(shelf.getByTestId('landing-ba-active-row')).toHaveText('Clothes');
      const board = shelf.getByRole('img', { name: /scattered across Saved Messages/ });
      expect(await board.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    });
  });
});

test.describe('landing app preview motion', () => {
  /** Three cards in the DOM; a narrow panel clips the ones that do not fit at a readable width. */
  const cards = (page: Page): Locator => page.locator('.landing-hero-preview__item');
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
    await expect(cards(page)).toHaveCount(3);

    // The toast is the last to arrive: when it is done, every card is done.
    await expect(toast(page)).toHaveCSS('opacity', '1', { timeout: 5000 });
    for (const card of await cards(page).all()) {
      await expect(card).toHaveCSS('opacity', '1');
    }
    await expect.poll(() => running(page)).toBe(0);
    // Played once: it does not start again while the page stays open.
    await page.waitForTimeout(1500);
    expect(await running(page)).toBe(0);
    await expect(toast(page)).toContainText('Saved to Read later');
    await expect(toast(page)).toContainText('Undo');
  });

  test('is a decorative picture: hidden from assistive technology, nothing in it can be focused', async ({
    page,
  }) => {
    await page.goto('/');
    const picture = page.locator('.landing-hero-preview');

    await expect(picture).toHaveAttribute('aria-hidden', 'true');
    await expect(picture).toHaveAttribute('inert', '');
    await expect(page.getByRole('link', { name: /css grid/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Undo' })).toHaveCount(0);
  });

  test.describe('prefers-reduced-motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('shows the final frame at once: the cards and the toast, nothing moving', async ({
      page,
    }) => {
      await page.goto('/');

      await expect(cards(page)).toHaveCount(3);
      await expect(toast(page)).toHaveCSS('opacity', '1');
      for (const card of await cards(page).all()) {
        await expect(card).toHaveCSS('opacity', '1');
      }
      expect(
        await page
          .locator('.landing-hero-preview')
          .evaluate((el) => el.getAnimations({ subtree: true }).length),
      ).toBe(0);
    });

    test('axe stays clean and nothing scrolls sideways at 360px', async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto('/');
      await expect(toast(page)).toBeVisible();
      await expectNoBlockingViolations(page, testInfo);

      const overflow = await page.evaluate<number>(
        '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
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

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 360, height: 780 },
] as const;

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

    test.describe(`landing accessibility with motion (${colorScheme}, ${viewport.name})`, () => {
      test.use({ colorScheme, viewport: { width: viewport.width, height: viewport.height } });

      test('page scrolled to the end has no serious or critical axe violations', async ({
        page,
      }, testInfo) => {
        await gotoLandingLoaded(page);
        // Scroll through the page: each section reveals when it comes into view.
        await scrollThrough(page);
        await expect(
          page.getByRole('region', { name: 'Empty your Saved Messages.' }).locator('h2'),
        ).toHaveCSS('opacity', '1');
        // Motion is on: the before board loops forever and is held mid-frame once it leaves the
        // screen, so scrolling past it can leave it half way through its entrance. Bring it back,
        // wait for the entrance to finish, then hold the loop (pointer over the section) before
        // the scan, so axe reads fully opaque scraps.
        expect(await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")).toBe(
          false,
        );
        const board = page.getByRole('region', { name: 'The same links, before and after' });
        await board.scrollIntoViewIfNeeded();
        const before = board.locator('.landing-before__before');
        await expect(before).toHaveClass(/landing-before__before--entered/);
        for (const scrap of await board
          .locator('.landing-before__scrap, .landing-before__ping')
          .all()) {
          await expect(scrap).toHaveCSS('opacity', '1');
        }
        await board.locator('.landing-ba__scenes').hover();
        await expect(before).toHaveClass(/landing-before__before--holding/);
        await page.evaluate('scrollTo(0, document.documentElement.scrollHeight)');
        await settleReveals(page);
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo);
      });

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
