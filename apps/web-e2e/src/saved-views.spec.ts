import { type Locator, type Page } from '@playwright/test';
import { openFeed } from './support/a11y-flows';
import { isCompact } from './support/sidebar';
import { expect, test } from './support/test';

// The mock state lives in the page: after the first load every step navigates inside the app.
test.describe('saved views (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  const views = (page: Page): Locator => page.getByRole('toolbar', { name: 'Saved views' });
  const chip = (page: Page, name: string | RegExp): Locator =>
    views(page).getByRole('button', { name, exact: typeof name === 'string' ? false : undefined });
  const chipNames = async (page: Page): Promise<string[]> =>
    (await views(page).locator('.ui-saved-views__label').allTextContents()).map((text) =>
      text.trim(),
    );

  /** The menu of a view; on a mouse the "..." button shows on hover. */
  async function viewMenuItem(page: Page, name: string, item: string): Promise<void> {
    const trigger = views(page).getByRole('button', { name: `Actions for ${name}` });
    if (!isCompact(page)) {
      await chip(page, new RegExp(`^${name} \\d+$`)).hover();
    }
    await trigger.click();
    await page.getByRole('menuitem', { name: item }).click();
  }

  /** The number in the heading line ("12 links"). */
  async function headingCount(page: Page): Promise<number> {
    const text = (await page.locator('.library__count').textContent()) ?? '';
    return Number(/(\d+)/.exec(text)?.[1] ?? Number.NaN);
  }

  test('All is pressed on the feed; a view applies its filter and shows its count', async ({
    page,
  }) => {
    await openFeed(page);
    await expect(views(page)).toBeVisible();
    expect(await chipNames(page)).toEqual(['All', 'Videos', 'Articles']);
    await expect(chip(page, /^All \d+$/)).toHaveAttribute('aria-pressed', 'true');
    await expect(views(page).getByRole('button', { name: 'Save this view' })).toBeVisible();

    const videos = chip(page, /^Videos \d+$/);
    const count = Number(/(\d+)$/.exec((await videos.textContent())?.trim() ?? '')?.[1]);
    await videos.click();
    await expect(page).toHaveURL('/links?kind=video');
    await expect(videos).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, /^All \d+$/)).toHaveAttribute('aria-pressed', 'false');
    // The kind shows as a removable filter chip, and the feed holds exactly the counted links.
    await expect(page.getByRole('group', { name: 'Filter' })).toContainText('Videos');
    await expect.poll(() => headingCount(page)).toBe(count);

    await chip(page, /^All \d+$/).click();
    await expect(page).toHaveURL('/links');
  });

  test('saves the current filter, renames, reorders and deletes a view', async ({ page }) => {
    await openFeed(page, '/unsorted?kind=shopping');
    await expect(chip(page, /^All \d+$/)).toHaveAttribute('aria-pressed', 'false');

    // On a feed other than All links "Save this view" stores the type only (#335).
    await views(page).getByRole('button', { name: 'Save this view' }).click();
    const dialog = page.getByRole('dialog', { name: 'Save this view' });
    await expect(dialog.getByRole('textbox', { name: 'Name' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Save view' }).click();
    await expect(dialog.getByText('Enter a name')).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Name' }).fill('Inbox');
    await dialog.getByRole('button', { name: 'Save view' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('View saved')).toBeVisible();
    await expect(chip(page, /^Inbox \d+$/)).toHaveAttribute('aria-pressed', 'true');
    expect(await chipNames(page)).toEqual(['All', 'Videos', 'Articles', 'Inbox']);

    // The chips work inside the feed they are on: All is the feed, a view filters it.
    await chip(page, /^All \d+$/).click();
    await expect(page).toHaveURL('/unsorted');
    await chip(page, /^Inbox \d+$/).click();
    await expect(page).toHaveURL('/unsorted?kind=shopping');

    await viewMenuItem(page, 'Inbox', 'Rename');
    const rename = page.getByRole('dialog', { name: 'Rename view' });
    await rename.getByRole('textbox', { name: 'Name' }).fill('Later');
    await rename.getByRole('button', { name: 'Rename' }).click();
    await expect(chip(page, /^Later \d+$/)).toBeVisible();

    await viewMenuItem(page, 'Later', 'Move left');
    await expect.poll(() => chipNames(page)).toEqual(['All', 'Videos', 'Later', 'Articles']);
    await viewMenuItem(page, 'Videos', 'Move right');
    await expect.poll(() => chipNames(page)).toEqual(['All', 'Later', 'Videos', 'Articles']);

    await viewMenuItem(page, 'Later', 'Delete view');
    const confirm = page.getByRole('alertdialog', { name: 'Delete view Later?' });
    await confirm.getByRole('button', { name: 'Delete view' }).click();
    await expect(page.getByText('View deleted')).toBeVisible();
    expect(await chipNames(page)).toEqual(['All', 'Videos', 'Articles']);
  });

  test('the chips work inside a folder: its own counts, the type filter stays there, tooltips say what they filter (#335)', async ({
    page,
  }) => {
    await openFeed(page, '/folders/00000000-0000-4000-8000-000000000101');
    const all = chip(page, /^All \d+$/);
    await expect(all).toHaveAttribute('aria-pressed', 'true');
    const countOf = async (locator: Locator): Promise<number> =>
      Number(/(\d+)$/.exec((await locator.textContent())?.trim() ?? '')?.[1]);
    const inFolder = await countOf(all);
    // Reading holds 39 of the 60 links: the counts are the folder's, not the library's.
    expect(inFolder).toBeLessThan(60);
    const videos = chip(page, /^Videos \d+$/);
    expect(await countOf(videos)).toBeLessThanOrEqual(inFolder);
    await expect(videos).toHaveAttribute('aria-description', 'Links detected as videos');
    await expect(chip(page, /^Articles \d+$/)).toHaveAttribute(
      'aria-description',
      'Links detected as articles',
    );

    await videos.click();
    await expect(page).toHaveURL(/\/folders\/00000000-0000-4000-8000-000000000101\?kind=video$/u);
    await expect(videos).toHaveAttribute('aria-pressed', 'true');
    await all.click();
    await expect(page).toHaveURL(/\/folders\/00000000-0000-4000-8000-000000000101$/u);
  });

  test('after saving a view with the keyboard focus is on its chip', async ({ page }) => {
    await openFeed(page, '/unsorted?kind=shopping');

    await views(page).getByRole('button', { name: 'Save this view' }).focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Save this view' });
    await dialog.getByRole('textbox', { name: 'Name' }).fill('Keyboard view');
    await page.keyboard.press('Enter');

    await expect(dialog).toHaveCount(0);
    await expect(chip(page, /^Keyboard view \d+$/)).toBeFocused();
  });
});
