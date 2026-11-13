import { type Locator, type Page } from '@playwright/test';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { seedSession } from './support/mock-session';
import { expect, test } from './support/test';
import { switchView } from './support/library-toolbar';

// Settings › Library (issue #284): the default view journey; the other settings are proven in
// TestBed (#349). In the mock build the account settings live in
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

test.describe('settings › library (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
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
});
