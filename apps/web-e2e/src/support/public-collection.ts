import { expect, type Locator, type Page } from '@playwright/test';
import { MOCK_FIXTURE } from '../models/mock-fixture.const';
import { pickFolderMenuItem } from './a11y-flows';

// Same value as MOCK_SHARES_STORAGE_KEY in apps/web/src/app/features/sharing/models.
export const MOCK_SHARES_KEY = 'sm-mock-shares';

/** A public link of the mock API on the Reading folder (22-character token, notes off). */
export const SAMPLE_SHARE = {
  token: 'e2eShareToken-e2eShare',
  folderId: MOCK_FIXTURE.readingId,
  showNotes: false,
  ownerName: 'E2E',
  createdAt: '2026-11-10T00:00:00.000Z',
} as const;

/**
 * Seeds the mock public links before the app starts. The mock library is the same in every
 * browser context, so this stands in for the shared server when a guest opens the link.
 */
export async function seedShares(page: Page, shares: string): Promise<void> {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [MOCK_SHARES_KEY, shares],
  );
}

/** The mock public links as the owner's page stores them. */
export function readShares(page: Page): Promise<string> {
  return page.evaluate((key) => localStorage.getItem(key) ?? '[]', MOCK_SHARES_KEY);
}

/** Opens "Share…" from the folder menu and returns the dialog. */
export async function openShareDialog(page: Page, folder: string): Promise<Locator> {
  await pickFolderMenuItem(page, folder, 'Share…');
  const dialog = page.getByRole('dialog', { name: `Share “${folder}”` });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Turns the public link on in an open share dialog and returns the public URL. */
export async function enablePublicLink(dialog: Locator): Promise<string> {
  const toggle = dialog.getByRole('switch', { name: 'Public link' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  const field = dialog.getByLabel('Public link address');
  await expect(field).toHaveValue(/\/c\/[A-Za-z0-9_-]{22}$/);
  return field.inputValue();
}
