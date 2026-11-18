import type { Locator, Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { seedAi } from './support/ai';
import { seedSession } from './support/mock-session';
import { isCompact, tabBar } from './support/sidebar';
import { expect, test } from './support/test';

// Same value as MOCK_LINKS_SCENARIO_KEY / MOCK_LINKS_SCENARIO.Showcase in apps/web: the mock
// starts from the demo library, which has 12 links in Unsorted with AI suggestions (AI-2).
const SCENARIO_KEY = 'sm-mock-links-scenario';
const SHOWCASE = 'showcase';
const SUGGESTED = 12;
/** The Unsorted youtube.com link with a Videos suggestion: applying it brings the rule offer. */
const FIRESHIP = 'Fireship';

/** Signed in on Unsorted of the demo library, AI on unless `ai` is false. */
async function openUnsorted(page: Page, ai = true): Promise<void> {
  await page.addInitScript(
    ([key, value]) => sessionStorage.setItem(key, value),
    [SCENARIO_KEY, SHOWCASE],
  );
  if (ai) {
    await seedAi(page);
  }
  await seedSession(page);
  await page.goto('/unsorted');
  await expect(page.getByRole('heading', { level: 1, name: 'Unsorted' })).toBeVisible();
}

function entry(page: Page): Locator {
  return page.getByRole('link', { name: /^Tidy with suggestions/ });
}

/** Opens Tidy Unsorted from the Unsorted header. */
async function openTidy(page: Page): Promise<void> {
  await expect(entry(page)).toContainText(String(SUGGESTED));
  await entry(page).click();
  await expect(page).toHaveURL('/unsorted/tidy');
  await expect(page.getByRole('heading', { level: 1, name: 'Tidy Unsorted' })).toBeVisible();
}

function row(page: Page, title: string): Locator {
  return page.locator('app-tidy-row').filter({ hasText: title });
}

function changes(page: Page, title: string): Locator {
  return page.getByRole('toolbar', { name: `Changes for ${title}` });
}

function status(page: Page, text: string | RegExp): Locator {
  return page.locator('ui-toast').filter({ hasText: text });
}

// The mock state lives in the page: every step navigates inside the app after the first load.
test.describe('Tidy Unsorted (AI-2, mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('reviews, leaves a chip out, skips, applies with one Undo', async ({ page }) => {
    await openUnsorted(page);
    await openTidy(page);
    await expect(page.getByText(`Suggestions for ${SUGGESTED} links.`)).toBeVisible();
    const apply = page.getByRole('button', { name: `Apply to ${SUGGESTED} links` });
    await expect(apply).toBeEnabled();

    // Leave the tag of Fireship out: its folder still applies.
    const tag = changes(page, FIRESHIP).getByRole('button', { name: 'Add tag video, added' });
    await tag.click();
    await expect(
      changes(page, FIRESHIP).getByRole('button', { name: 'Add tag video' }),
    ).toHaveAttribute('aria-pressed', 'false');

    // Skip one link, undo the skip, skip it again.
    const cos = row(page, 'COS');
    await cos.getByRole('button', { name: 'Skip' }).click();
    await expect(cos).toContainText('Skipped — stays in Unsorted');
    await expect(
      page.getByRole('button', { name: `Apply to ${SUGGESTED - 1} links` }),
    ).toBeVisible();
    await cos.getByRole('button', { name: 'Undo skip' }).click();
    await expect(cos.getByRole('button', { name: 'Skip' })).toBeFocused();
    await cos.getByRole('button', { name: 'Skip' }).click();

    await page.getByRole('button', { name: `Apply to ${SUGGESTED - 1} links` }).click();
    const toast = status(page, `Tidied ${SUGGESTED - 1} links`);
    await expect(toast).toBeVisible();
    // Only the skipped link is left, so there is nothing to tidy.
    await expect(page.getByRole('heading', { name: 'Nothing to tidy' })).toBeVisible();

    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(status(page, 'Tidy undone')).toBeVisible();
    await expect(page.getByText(`Suggestions for ${SUGGESTED} links.`)).toBeVisible();
  });

  test('applying everything leaves "Nothing to tidy" and empties Unsorted of those links', async ({
    page,
  }) => {
    await openUnsorted(page);
    await openTidy(page);
    await page.getByRole('button', { name: `Apply to ${SUGGESTED} links` }).click();
    await expect(page.getByRole('heading', { name: 'Nothing to tidy' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to Unsorted' }).click();
    await expect(page).toHaveURL('/unsorted');
    await expect(page.locator('ui-card').filter({ hasText: 'Serious Eats' })).toHaveCount(0);
    await expect(entry(page)).toHaveCount(0);
  });

  test('a rule offer after filing youtube.com into Videos: Create rule', async ({ page }) => {
    await openUnsorted(page);
    await openTidy(page);
    await page.getByRole('button', { name: `Apply to ${SUGGESTED} links` }).click();
    // The offer waits until the Undo toast of the run closes without Undo.
    const tidied = status(page, `Tidied ${SUGGESTED} links`);
    await tidied.getByRole('button', { name: 'Dismiss' }).click();
    const offer = status(page, 'Always put youtube.com links in Videos?');
    await expect(offer).toBeVisible();
    await expect(offer).toContainText('Your last 3 links from this site are there.');
    await offer.getByRole('button', { name: 'Create rule' }).click();
    await expect(status(page, 'Rule created')).toContainText('youtube.com: Videos');
  });

  test('"Not now" is remembered for the site', async ({ page }) => {
    await openUnsorted(page);
    await openTidy(page);
    await page.getByRole('button', { name: `Apply to ${SUGGESTED} links` }).click();
    await status(page, `Tidied ${SUGGESTED} links`)
      .getByRole('button', { name: 'Dismiss' })
      .click();
    const offer = status(page, 'Always put youtube.com links in Videos?');
    await offer.getByRole('button', { name: 'Not now' }).click();
    await expect(offer).toHaveCount(0);
  });

  test('AI off hides the button and the route goes back to Unsorted', async ({ page }) => {
    await openUnsorted(page, false);
    await expect(page.locator('ui-card').first()).toBeVisible();
    await expect(entry(page)).toHaveCount(0);
    await page.goto('/unsorted/tidy');
    await expect(page).toHaveURL('/unsorted');
  });

  test(
    'phone: cards, the apply bar instead of the tab bar, Undo',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await openUnsorted(page);
      await openTidy(page);
      if (isCompact(page)) {
        await expect(tabBar(page)).toHaveCount(0);
        const bar = page.getByRole('group', { name: 'Apply suggestions' });
        await expect(
          bar.getByRole('button', { name: `Apply to ${SUGGESTED} links` }),
        ).toBeVisible();
      }
      await expect(row(page, FIRESHIP)).toBeVisible();
      await page.getByRole('button', { name: `Apply to ${SUGGESTED} links` }).click();
      const toast = status(page, `Tidied ${SUGGESTED} links`);
      await toast.getByRole('button', { name: 'Undo' }).click();
      await expect(status(page, 'Tidy undone')).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page).toHaveURL('/unsorted');
      if (isCompact(page)) {
        await expect(tabBar(page)).toBeVisible();
      }
    },
  );
});
