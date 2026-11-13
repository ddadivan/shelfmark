import { expect, type Page } from '@playwright/test';
import { MOCK_LINKS_SCENARIO } from '../../src/models/mock-links-scenario.const';
import { NEW_USER, dismissOnboarding, seedSession } from '../../src/support/mock-session';

/** Opens the add link dialog (a sheet on a phone) from the header or tab bar button. */
export async function openAddLinkDialog(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add link' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Add link' })).toBeVisible();
}

/** A new user with an empty library, the welcome tour dismissed. */
export async function openEmptyLibraryAsNewUser(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => sessionStorage.setItem(key, value),
    [MOCK_LINKS_SCENARIO.key, MOCK_LINKS_SCENARIO.empty],
  );
  await seedSession(page, NEW_USER);
  await page.goto('/links');
  await dismissOnboarding(page);
  await expect(page.getByRole('heading', { name: 'Your links will live here' })).toBeVisible();
}
