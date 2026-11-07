import { expect, type Page, test } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { LANDING_HEADLINE } from './models/landing-headline.const';

test.describe('landing', () => {
  test('a guest sees the headline and the sections in order', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    const headings = await page.getByRole('heading', { level: 2 }).allTextContents();
    expect(headings.map((text) => text.trim())).toEqual([
      'The same links, before and after',
      'Why this exists',
      "How it's built",
      'Empty your Saved Messages.',
    ]);
  });

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
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();

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
      await expect(shelf.locator('.landing-ba__row--active')).toHaveText('Clothes');
    });
  });
});

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
        await page.goto('/');
        await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo);
      });

      test('shelf state has no serious or critical axe violations', async ({ page }, testInfo) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Put them on the shelf' }).click();
        await expect(page.getByText('Notes come from your own messages.')).toBeVisible();
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo);
      });
    });

    test.describe(`landing accessibility with motion (${colorScheme}, ${viewport.name})`, () => {
      test.use({ colorScheme, viewport: { width: viewport.width, height: viewport.height } });

      test('page scrolled to the end has no serious or critical axe violations', async ({
        page,
      }, testInfo) => {
        await page.goto('/');
        await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
        await expect(
          page.getByRole('region', { name: 'Empty your Saved Messages.' }).locator('h2'),
        ).toHaveCSS('opacity', '1');
        // Sections skipped by the jump reveal through the 1 s safety timeout.
        await settleReveals(page);
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo);
      });

      test('shelf with the pause button pressed has no serious or critical axe violations', async ({
        page,
      }, testInfo) => {
        await page.goto('/');
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
