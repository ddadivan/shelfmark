import { expect, test } from '@playwright/test';
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

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 360, height: 780 },
] as const;

for (const colorScheme of Object.values(COLOR_SCHEME)) {
  for (const viewport of VIEWPORTS) {
    test.describe(`landing accessibility (${colorScheme}, ${viewport.name})`, () => {
      test.use({ colorScheme, viewport: { width: viewport.width, height: viewport.height } });

      test('chat state has no serious or critical axe violations', async ({ page }, testInfo) => {
        await gotoLandingLoaded(page);
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo);
      });

      test('shelf state has no serious or critical axe violations', async ({ page }, testInfo) => {
        await gotoLandingLoaded(page);
        await page.getByRole('button', { name: 'Put them on the shelf' }).click();
        await expect(page.getByText('Notes come from your own messages.')).toBeVisible();
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo);
      });
    });
  }
}
