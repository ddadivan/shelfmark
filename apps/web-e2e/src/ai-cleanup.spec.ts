import type { Locator, Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { seedAi } from './support/ai';
import { openSettingsSection, seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';
import { expect, test } from './support/test';

// Same value as MOCK_LINKS_SCENARIO_KEY / MOCK_LINKS_SCENARIO.Showcase in apps/web: the mock
// starts from the demo library, which saves Hacker News three times, has the signals guide on
// angular.dev and next.angular.dev, and the tags javascript / js and recipes / cooking (AI-5).
const SCENARIO_KEY = 'sm-mock-links-scenario';
const SHOWCASE = 'showcase';
/** The mock's AI pass takes 4 s and the page polls every 3 s. */
const CHECK_WAIT = { timeout: 15_000 } as const;

/** Signed in on All links of the demo library; AI on (the AI pack) unless `ai` is false. */
async function openLinks(page: Page, ai = true): Promise<void> {
  await page.addInitScript(
    ([key, value]) => sessionStorage.setItem(key, value),
    [SCENARIO_KEY, SHOWCASE],
  );
  await seedAi(page, { enabled: ai });
  await seedSession(page);
  await page.goto('/links');
  await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
}

function toast(page: Page, text: string | RegExp): Locator {
  return page.locator('ui-toast').filter({ hasText: text });
}

/** Settings › Library › Clean up (You › Library › Clean up on the phone), inside the app. */
async function openCleanup(page: Page): Promise<void> {
  await openSettingsSection(page, 'Library');
  await page.getByRole('link', { name: 'Review' }).click();
  await expect(page).toHaveURL('/settings/library/cleanup');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Clean up your library' }),
  ).toBeVisible();
}

// The mock state lives in the page: every step navigates inside the app after the first load.
test.describe('Library clean-up (AI-5, mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('runs with AI checks, unchecks a row, swaps a tag, applies and undoes the whole run', async ({
    page,
  }) => {
    await openLinks(page);
    // Clean-up is no card above the feed (#512): it lives in Settings › Library.
    await expect(page.locator('app-cleanup-card')).toHaveCount(0);
    await openCleanup(page);

    await expect(page.getByRole('switch', { name: 'Include AI checks' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.getByRole('button', { name: 'Check my library' }).click();
    await expect(page.getByText('Checking your library…').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Duplicates' })).toBeVisible(CHECK_WAIT);

    await expect(page.getByRole('checkbox', { name: 'Hacker News' })).toBeChecked();
    await expect(
      page.getByText('Saved 3 times: keep the one in Unsorted (it has more tags), move 2 copies'),
    ).toBeVisible();
    await expect(
      page.getByText('angular.dev and next.angular.dev: keep angular.dev'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Similar tags' })).toBeVisible();
    await expect(page.locator('ui-ai-line')).toContainText('Found by AI');
    await expect(page.getByRole('button', { name: 'Apply 5 changes' })).toBeVisible();

    // The label is the hit area (the native box is drawn over by the styled one).
    await page.getByText('recipes ← cooking', { exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'recipes ← cooking' })).not.toBeChecked();
    await page.getByRole('button', { name: 'Keep “js” instead' }).click();
    await expect(page.getByRole('checkbox', { name: 'js ← javascript' })).toBeChecked();
    await page.getByRole('button', { name: 'Apply 4 changes' }).click();

    const done = toast(page, 'Cleaned up 4 things');
    await expect(done).toContainText('3 copies in Trash, 1 tag merged');
    await expect(page.getByRole('heading', { name: 'All cleaned up' })).toBeVisible();

    await done.getByRole('button', { name: 'Undo' }).click();
    await expect(toast(page, 'Clean-up undone')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Hacker News' })).toBeChecked();
    // The unchecked pair stays unchecked; Undo re-creates the merged tag "javascript" as a new tag,
    // so its pair leaves the report.
    await expect(page.getByRole('checkbox', { name: 'recipes ← cooking' })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'javascript ← js' })).toHaveCount(0);
  });

  test('AI off: exact duplicates only, nothing AI', async ({ page }) => {
    await openLinks(page, false);
    await openCleanup(page);
    await expect(page.getByRole('switch', { name: 'Include AI checks' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Check my library' }).click();
    await expect(page.getByRole('heading', { name: 'Duplicates' })).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Similar tags' })).toHaveCount(0);
    await expect(page.getByText('Found by AI')).toHaveCount(0);
  });

  test(
    'the page in one column on the phone: apply bar and Undo',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await openLinks(page, false);
      await openCleanup(page);
      await page.getByRole('button', { name: 'Check my library' }).click();
      // The mobile shell floats Cancel and Apply in a bar above the tab bar; desktop has them on top.
      const actions = isCompact(page)
        ? page.getByRole('group', { name: 'Clean-up actions' })
        : page;
      await actions.getByRole('button', { name: 'Apply 2 changes' }).click();
      const done = toast(page, 'Cleaned up 2 things');
      await expect(done).toContainText('2 copies in Trash');
      await done.getByRole('button', { name: 'Undo' }).click();
      await expect(toast(page, 'Clean-up undone')).toBeVisible();
      await expect(page.getByRole('checkbox', { name: 'Hacker News' })).toBeChecked();
    },
  );
});
