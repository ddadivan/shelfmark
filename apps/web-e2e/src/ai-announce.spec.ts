import type { Page } from '@playwright/test';
import { seedSession } from './support/mock-session';
import { expect, test } from './support/test';

// Same value as MOCK_AI_ANNOUNCEMENT_STORAGE_KEY in apps/web (the seeded session has seen it).
const ANNOUNCEMENT_KEY = 'sm-mock-ai-announcement';
const FLAG = 'ai-announce-unseen';
const TITLE = 'Shelfmark can now help with AI';

/** Signed in with AI off and the announcement not seen yet (once per tab session). */
async function openUnseen(page: Page): Promise<void> {
  await seedSession(page);
  await page.addInitScript(
    ([key, flag]) => {
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, '1');
        localStorage.removeItem(key);
      }
    },
    [ANNOUNCEMENT_KEY, FLAG],
  );
  await page.goto('/links');
}

test.describe('AI announcement (#507, mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('"Turn on AI…" opens the AI intro; the announcement does not come back', async ({
    page,
  }) => {
    await openUnseen(page);
    const dialog = page.getByRole('dialog', { name: TITLE });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole('button', { name: 'Turn on AI…' }).click();
    const intro = page.getByRole('dialog', { name: 'Turn on AI in Shelfmark?' });
    await expect(intro).toBeVisible();
    await intro.getByRole('button', { name: 'Not now' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('ui-card').first()).toBeVisible();
    await page.waitForTimeout(3500);
    await expect(page.getByRole('dialog', { name: TITLE })).toHaveCount(0);
  });

  test('Not now and Esc remember it', async ({ page }) => {
    await openUnseen(page);
    const dialog = page.getByRole('dialog', { name: TITLE });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole('button', { name: 'Not now' }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(page.locator('ui-card').first()).toBeVisible();
    await page.waitForTimeout(3500);
    await expect(page.getByRole('dialog', { name: TITLE })).toHaveCount(0);
  });
});
