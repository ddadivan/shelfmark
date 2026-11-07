import { expect, test, type Locator, type Page } from '@playwright/test';
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
      'The same links, before and after',
      'Why this exists',
      "How it's built",
      'Empty your Saved Messages.',
    ]);
  });

  test('"How it\'s built" in the header scrolls to and focuses the section', async ({ page }) => {
    // The header link is hidden on a phone by design (sign-in stays), so use a desktop width.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();

    // Straight away, possibly before the deferred sections are idle-loaded.
    await page.getByRole('banner').getByRole('link', { name: "How it's built" }).click();

    const section = page.getByRole('region', { name: "How it's built" });
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

  for (const width of [360, 800, 1280]) {
    test(`the deferred chat and sections shift nothing at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      // Plain scripts (as elsewhere in this suite): the e2e project has no DOM typings.
      await page.addInitScript(`
        window.__shifts = [];
        window.__textAt = null;
        // The frame in which the headline first has a height: the translated text of the hero
        // arrives one frame after the first paint, in the app as on main (#147), and moves
        // everything below it. Shifts up to that frame are not this change's.
        const watchText = (time) => {
          const title = document.querySelector('.landing-hero__title');
          if (title && title.getBoundingClientRect().height > 0) window.__textAt = time;
          else requestAnimationFrame(watchText);
        };
        requestAnimationFrame(watchText);
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
      // The chat swaps in on idle, after the headline: wait for it, then for the page to settle.
      await expect(page.getByRole('button', { name: 'Put them on the shelf' })).toBeVisible();
      await page.waitForTimeout(500);

      // The sources go into the failure message, so a CI failure says what moved.
      const textAt = await page.evaluate<number | null>('window.__textAt');
      expect(textAt, 'the headline text never showed').not.toBeNull();
      const all = await page.evaluate<{ at: number; value: number }[]>('window.__shifts');
      const shifts = all.filter((shift) => shift.at > (textAt ?? 0));
      const total = shifts.reduce((sum, shift) => sum + shift.value, 0);
      expect(total, JSON.stringify(shifts)).toBeLessThan(0.001);
    });
  }

  test('"Put them on the shelf" swaps the chat for the shelf and back', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Five links, five different days.')).toBeVisible();

    await page.getByRole('button', { name: 'Put them on the shelf' }).click();
    await expect(page.getByText('Notes come from your own messages.')).toBeVisible();
    await expect(page.getByText('5 links in 4 folders, each with a note')).toBeVisible();

    await page.getByRole('button', { name: 'Show the chat again' }).click();
    await expect(page.getByText('Five links, five different days.')).toBeVisible();
  });

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

  test('the call-to-action buttons point to sign-in', async ({ page }) => {
    await page.goto('/');
    const finale = page.getByRole('region', { name: 'Empty your Saved Messages.' });

    await expect(finale.getByRole('link', { name: 'Open the demo' })).toHaveAttribute(
      'href',
      '/sign-in',
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

    await page.getByRole('button', { name: 'Put them on the shelf' }).click();
    const afterSwap = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(afterSwap).toBeLessThanOrEqual(0);
  });
});

test.describe('landing scenes and reveals', () => {
  test('sections below the first screen are visible after scrolling to them', async ({ page }) => {
    await page.goto('/');
    const finale = page.getByRole('region', { name: 'Empty your Saved Messages.' });

    await finale.scrollIntoViewIfNeeded();

    await expect(finale.getByRole('link', { name: 'Open the demo' })).toBeVisible();
    await expect(finale.locator('h2')).toHaveCSS('opacity', '1');
    await expect(page.getByRole('region', { name: 'Why this exists' }).locator('h2')).toHaveCSS(
      'opacity',
      '1',
    );
  });

  test('the shelf cycles folders and the pause control stops it', async ({ page }) => {
    await page.goto('/');
    const shelf = page.getByRole('region', { name: 'The same links, before and after' });
    await shelf.scrollIntoViewIfNeeded();
    const pause = shelf.getByRole('button', { name: 'Pause animations' });

    await expect(shelf.getByText('Signal Forms', { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');

    // Pointer away from the scene, so only the button can be holding the cycle. The folders
    // advance every 3 s: a longer wait on the same active row proves the cycle stopped.
    await page.mouse.move(0, 0);
    const activeRow = shelf.getByTestId('landing-ba-active-row');
    const frozen = await activeRow.textContent();
    await page.waitForTimeout(3500);
    await expect(activeRow).toHaveText(frozen ?? '');
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

      await page.waitForTimeout(3500);
      await expect(shelf.getByTestId('landing-ba-active-row')).toHaveText('Clothes');
    });
  });
});

test.describe('landing chat motion', () => {
  const messages = (page: Page): Locator =>
    page.getByTestId('landing-chat-messages').getByRole('listitem');
  const track = (page: Page): Locator => page.getByTestId('landing-chat-track');
  const readStep = (feed: Locator): Promise<string> =>
    feed.evaluate((el) => el.style.getPropertyValue('--landing-chat-step'));

  test('the feed keeps rising while the block is on screen', async ({ page }) => {
    await page.goto('/');
    const feed = track(page);
    await expect(feed).toBeAttached();

    await expect.poll(() => readStep(feed), { timeout: 8000 }).not.toBe('0');
  });

  test('the pause button stops the feed and a second press resumes it', async ({ page }) => {
    await page.goto('/');
    const feed = track(page);
    const pause = page.getByRole('button', { name: 'Pause the feed' });
    await expect.poll(() => readStep(feed), { timeout: 8000 }).not.toBe('0');

    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    // Move the pointer away from the phone so only the button can be holding the feed.
    await page.mouse.move(0, 0);
    const frozen = await readStep(feed);
    await page.waitForTimeout(4000);
    expect(await readStep(feed)).toBe(frozen);

    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => readStep(feed), { timeout: 8000 }).not.toBe(frozen);
  });

  test('"Put them on the shelf" clears the messages and lands the links', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Put them on the shelf' }).click();

    await expect(page.getByText('Notes come from your own messages.')).toBeVisible();
    await expect(page.getByTestId('landing-chat-shelf-card')).toHaveCount(5);
    await expect(track(page)).toHaveCount(0);
  });

  test.describe('prefers-reduced-motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('shows the static final frame: five messages, no moving feed', async ({ page }) => {
      await page.goto('/');

      await expect(messages(page)).toHaveCount(5);
      await expect(track(page)).toHaveCount(0);
    });

    test('swaps to the shelf at once, axe stays clean and nothing scrolls sideways at 360px', async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto('/');
      await expect(messages(page)).toHaveCount(5);
      await expectNoBlockingViolations(page, testInfo);

      await page.getByRole('button', { name: 'Put them on the shelf' }).click();
      await expect(page.getByText('Notes come from your own messages.')).toBeVisible();
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

      test('chat state has no serious or critical axe violations', async ({ page }, testInfo) => {
        await gotoLandingLoaded(page);
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo);
      });

      test('shelf state has no serious or critical axe violations', async ({ page }, testInfo) => {
        await gotoLandingLoaded(page);
        await page.getByRole('button', { name: 'Put them on the shelf' }).click();
        await expect(page.getByText('Notes come from your own messages.')).toBeVisible();
        // The cards fade in while they land; axe reads the colours of a finished frame.
        await page.evaluate(
          'Promise.all(document.getAnimations().map((animation) => animation.finished)).then(() => undefined)',
        );
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
        await settleReveals(page);
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo);
      });

      test('shelf with the pause button pressed has no serious or critical axe violations', async ({
        page,
      }, testInfo) => {
        await gotoLandingLoaded(page);
        // Every section reveals when it is seen; then come back to the shelf and pause it.
        await scrollThrough(page);
        const shelf = page.getByRole('region', { name: 'The same links, before and after' });
        await shelf.scrollIntoViewIfNeeded();
        await shelf.getByRole('button', { name: 'Pause animations' }).click();
        await settleReveals(page);
        await expect(page.locator('.landing-ba__item--enter')).toHaveCount(0, { timeout: 10_000 });
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo);
      });
    });
  }
}
