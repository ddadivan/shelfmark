import { type Locator, type Page } from '@playwright/test';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { isPhone } from './support/sidebar';
import { expect, test } from './support/test';
import { chooseSort, expectSort, switchView } from './support/library-toolbar';

// Settings › Library in full (issue #284). In the mock build the account settings live in
// localStorage (`MockUserSettingsApi`), so a reload sees them like it would see the server's; the
// mock links reset on a reload, the settings do not.

const READING = `/folders/${MOCK_FIXTURE.readingId}`;

function choice(page: Page, group: string, name: string): Locator {
  return page.getByRole('radiogroup', { name: group }).getByRole('radio', { name, exact: true });
}

async function pick(page: Page, group: string, name: string): Promise<void> {
  // A click event on the radio itself: the visually hidden input can sit under the phone tab bar.
  await choice(page, group, name).dispatchEvent('click');
  await expect(choice(page, group, name)).toBeChecked();
}

function toggle(page: Page, name: string): Locator {
  return page.getByRole('switch', { name, exact: true });
}

async function flip(page: Page, name: string, to: boolean): Promise<void> {
  await toggle(page, name).click();
  await expect(toggle(page, name)).toHaveAttribute('aria-checked', String(to));
}

async function selectOption(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option').filter({ hasText: option }).first().click();
  await expect(page.getByRole('combobox', { name: label })).toContainText(option);
}

async function openLibrarySettings(page: Page): Promise<void> {
  await page.goto('/settings/library');
  await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
  // The account's values are loaded once the folder colours switch shows the saved state.
  await expect(toggle(page, 'Show folder counts')).toBeVisible();
}

async function openFeed(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('ui-card, ui-list-item').first()).toBeVisible();
}

async function openAddLink(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Add link' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add link' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('settings › library (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test('shows the Viewing, Saving, Tags and folders and Trash sections with the note', async ({
    page,
  }) => {
    await openLibrarySettings(page);
    const main = page.getByRole('main');
    for (const title of ['Viewing', 'Saving', 'Tags and folders', 'Trash']) {
      await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
    }
    await expect(choice(page, 'Default view', 'Cards')).toBeChecked();
    await expect(choice(page, 'Open links in', 'New tab')).toBeChecked();
    await expect(toggle(page, 'Keep the query part of links')).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(main.getByText('Subfolders are always shown first in a folder')).toBeVisible();
    await expect(main.getByText('·')).toHaveCount(0);
  });

  test('Default view opens feeds as a list; a feed keeps its own switch over a reload', async ({
    page,
  }) => {
    await openLibrarySettings(page);
    await pick(page, 'Default view', 'List');

    await openFeed(page, '/links');
    await expect(page.locator('ui-list-item').first()).toBeVisible();
    await expect(page.locator('ui-card')).toHaveCount(0);

    // This feed goes back to cards; another feed still opens with the default.
    await switchView(page, 'Cards');
    await expect(page.locator('ui-card').first()).toBeVisible();
    await openFeed(page, READING);
    await expect(page.locator('ui-card')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('ui-list-item').first()).toBeVisible();
    await openFeed(page, '/links');
    await expect(page.locator('ui-card').first()).toBeVisible();
  });

  test('Sort links by starts feeds with it; a folder remembers its own choice', async ({
    page,
  }) => {
    await openLibrarySettings(page);
    await selectOption(page, 'Sort links by', 'Title A–Z');
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Sort links by' })).toContainText('Title A–Z');

    await openFeed(page, '/links');
    await expectSort(page, 'Title A–Z');
    await expect(page).toHaveURL('/links');

    await openFeed(page, READING);
    await chooseSort(page, 'Oldest first');
    await expectSort(page, 'Oldest first');

    await page.goto(READING);
    await expectSort(page, 'Oldest first');
    await openFeed(page, '/links');
    await expectSort(page, 'Title A–Z');
  });

  test('Open links in the same tab drops target on cards and rows', async ({ page }) => {
    await openFeed(page, '/links');
    const link = page.locator('ui-card a[href^="http"]').first();
    await expect(link).toHaveAttribute('target', '_blank');

    await openLibrarySettings(page);
    await pick(page, 'Open links in', 'Same tab');
    await page.reload();
    await expect(choice(page, 'Open links in', 'Same tab')).toBeChecked();

    await openFeed(page, '/links');
    await expect(link).not.toHaveAttribute('target', /.*/);
    await expect(link).toHaveAttribute('rel', 'noreferrer');
    await switchView(page, 'List');
    const row = page.locator('ui-list-item a[href^="http"]').first();
    await expect(row).not.toHaveAttribute('target', /.*/);
  });

  test('Show folder counts off drops the numbers in the sidebar', async ({ page }) => {
    test.skip(isPhone(page), 'the phone has no sidebar tree');
    await openFeed(page, '/links');
    await expect(page.locator('.ui-tree__count').first()).toBeVisible();

    await openLibrarySettings(page);
    await flip(page, 'Show folder counts', false);
    await page.reload();
    await expect(toggle(page, 'Show folder counts')).toHaveAttribute('aria-checked', 'false');

    await openFeed(page, '/links');
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
    await expect(page.locator('.ui-tree__count')).toHaveCount(0);
  });

  test('New links go to a chosen folder in the add-link dialog', async ({ page }) => {
    await openLibrarySettings(page);
    await selectOption(page, 'New links go to', MOCK_FIXTURE.readingName);
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'New links go to' })).toContainText(
      MOCK_FIXTURE.readingName,
    );

    await openFeed(page, '/links');
    const dialog = await openAddLink(page);
    await expect(dialog.getByRole('combobox', { name: 'Folder' })).toContainText(
      MOCK_FIXTURE.readingName,
    );
  });

  test('Warn about duplicates off hides the duplicate notice', async ({ page }) => {
    await openLibrarySettings(page);
    await flip(page, 'Warn about duplicates', false);

    await openFeed(page, '/links');
    const dialog = await openAddLink(page);
    await dialog.getByLabel('Link', { exact: true }).fill('https://angular.dev/overview');
    await expect(dialog.getByLabel('Title', { exact: true })).not.toHaveValue('');
    await expect(dialog.getByText('You already saved this link')).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Save link' })).toBeVisible();
  });

  test('Fetch titles and previews off saves only the address', async ({ page }) => {
    await openLibrarySettings(page);
    await flip(page, 'Fetch titles and previews', false);
    await page.reload();
    await expect(toggle(page, 'Fetch titles and previews')).toHaveAttribute(
      'aria-checked',
      'false',
    );

    await openFeed(page, '/links');
    const dialog = await openAddLink(page);
    await dialog.getByLabel('Link', { exact: true }).fill('https://example.org/no-preview');
    await page.waitForTimeout(800);
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('');
    await expect(dialog.getByText('Filled in from the page')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Save link' }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.locator('ui-card').filter({ hasText: 'https://example.org/no-preview' }).first(),
    ).toBeVisible();
  });

  test('tracking parameters go on save unless the query part is kept', async ({ page }) => {
    await openFeed(page, '/links');
    let dialog = await openAddLink(page);
    await dialog
      .getByLabel('Link', { exact: true })
      .fill('https://example.org/coat?utm_source=news&id=7&fbclid=abc');
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Page on example.org');
    await dialog.getByRole('button', { name: 'Save link' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('ui-card a[href="https://example.org/coat?id=7"]')).toHaveCount(1);

    await openLibrarySettings(page);
    await flip(page, 'Keep the query part of links', true);
    await openFeed(page, '/links');
    dialog = await openAddLink(page);
    await dialog
      .getByLabel('Link', { exact: true })
      .fill('https://example.org/hat?utm_source=news');
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Page on example.org');
    await dialog.getByRole('button', { name: 'Save link' }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.locator('ui-card a[href="https://example.org/hat?utm_source=news"]'),
    ).toHaveCount(1);
  });

  test('has no axe violations', async ({ page }, testInfo) => {
    await openLibrarySettings(page);
    await settled(page);
    await expectNoBlockingViolations(page, testInfo);
  });
});
