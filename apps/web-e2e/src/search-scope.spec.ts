import { expect, test } from './support/test';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { seedSession } from './support/mock-session';

// Mirrors the contract mock link in no folder (libs/shared/contracts/src/testing).
const OTHER_LINK = 'Simple pasta';
const OTHER_WORD = 'pasta';

// The header search filters the feed on screen: inside a folder it is limited to it, the field
// says so with a chip, and the chip's × repeats the search in all links.
test.describe('search scope (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.skip(({ isMobile }) => isMobile, 'the mobile shell has no header search');
  test.use({ viewport: { width: 1440, height: 900 } });

  test('shows the folder as a chip in the field; its × searches all links with the same text', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto(`/folders/${MOCK_FIXTURE.readingId}`);

    const field = page.getByRole('combobox', { name: `Search in ${MOCK_FIXTURE.readingName}` });
    await expect(field).toBeVisible();
    const chip = page.locator('app-header-search ui-chip');
    await expect(chip).toContainText(MOCK_FIXTURE.readingName);

    await field.fill(OTHER_WORD);
    await expect(page).toHaveURL(
      new RegExp(`/folders/${MOCK_FIXTURE.readingId}\\?q=${OTHER_WORD}$`),
    );
    await expect(page.getByText(OTHER_LINK)).toHaveCount(0);

    await chip.getByRole('button', { name: 'Search all links' }).click();

    await expect(page).toHaveURL(new RegExp(`/links\\?q=${OTHER_WORD}$`));
    await expect(page.locator('app-header-search ui-chip')).toHaveCount(0);
    await expect(page.locator('ui-card', { hasText: OTHER_LINK })).toBeVisible();
    await expect(field).toHaveCount(0);
    const all = page.getByRole('combobox', { name: 'Search links, folders and tags' });
    await expect(all).toHaveValue(OTHER_WORD);
    await expect(all).toBeFocused();
  });

  test('a folder page with a match offers "Search all links" next to the count', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto(`/folders/${MOCK_FIXTURE.readingId}`);
    await page
      .getByRole('combobox', { name: `Search in ${MOCK_FIXTURE.readingName}` })
      .fill('signals');
    await expect(page).toHaveURL(/\?q=signals$/);
    await expect(page.locator('ui-card').first()).toBeVisible();

    await page
      .locator('app-library, main')
      .getByRole('button', { name: 'Search all links' })
      .first()
      .click();

    await expect(page).toHaveURL(/\/links\?q=signals$/);
    await expect(page.locator('ui-card').first()).toBeVisible();
    await expect(page.locator('app-header-search ui-chip')).toHaveCount(0);
  });
});
