import { expect, test } from '@playwright/test';

const HEADLINE = 'Paste a link. Find it again. Even in a year.';

test.describe('landing', () => {
  test('a guest sees the headline and the sections in order', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: HEADLINE })).toBeVisible();
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

  // The `/sign-in` route does not exist yet (auth pages, PR #86), so the router rejects the
  // navigation; this checks the link targets. Add a `toHaveURL` click-through once it lands.
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

  test('has no horizontal scroll at 360px width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: HEADLINE })).toBeVisible();

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
