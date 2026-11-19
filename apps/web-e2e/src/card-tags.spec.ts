import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { E2E_TAG } from './models/e2e-tag.const';

// The showcase library (demo seed) has "Signals vs RxJS: when to use which" with three tags.
const TITLE = 'Signals vs RxJS: when to use which';
const TAGS = ['angular', 'javascript', 'reading'];

async function openCards(page: Page): Promise<void> {
  await page.addInitScript(() => sessionStorage.setItem('sm-mock-links-scenario', 'showcase'));
  await seedSession(page);
  await page.goto('/links?tag=javascript');
  await expect(page.locator('ui-card').first()).toBeVisible();
}

function card(page: Page) {
  return page.locator('ui-card', { hasText: TITLE });
}

function moreTags(page: Page) {
  return card(page).getByRole('button', { name: '2 more tags: javascript, reading' });
}

test.describe('card tags (hotfix 2.2.1, mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test(
    'the footer shows the first tag and "+2"; "+2" opens "All tags" and a tag filters the library',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await openCards(page);
      const footer = card(page).locator('.link-card__foot');
      await expect(footer.getByRole('button', { name: 'angular', exact: true })).toBeVisible();
      await expect(moreTags(page)).toHaveText('+2');
      await expect(moreTags(page)).toHaveAttribute('aria-haspopup', 'dialog');
      await expect(moreTags(page)).toHaveAttribute('aria-expanded', 'false');

      // Hover on a desktop pointer; a tap on touch, where nothing hovers.
      const touch = await page.evaluate<boolean>("matchMedia('(hover: none)').matches");
      if (touch) {
        await moreTags(page).tap();
      } else {
        await moreTags(page).hover();
      }
      const dialog = page.getByRole('dialog', { name: 'All tags' });
      await expect(dialog).toBeVisible();
      await expect(moreTags(page)).toHaveAttribute('aria-expanded', 'true');
      await expect(dialog.getByRole('button')).toHaveText(TAGS);
      // The panel opens above "+2".
      const panel = await dialog.boundingBox();
      const trigger = await moreTags(page).boundingBox();
      expect(panel && trigger && panel.y + panel.height <= trigger.y + 1).toBe(true);

      await dialog.getByRole('button', { name: 'reading', exact: true }).click();
      await expect(page).toHaveURL(/[?&]tag=reading(&|$)/);
      await expect(dialog).toBeHidden();
    },
  );

  test('the pointer can move from "+2" into the panel; Esc closes it on "+2"', async ({ page }) => {
    await openCards(page);
    await moreTags(page).hover();
    const dialog = page.getByRole('dialog', { name: 'All tags' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'javascript', exact: true }).hover();
    await page.waitForTimeout(400);
    await expect(dialog).toBeVisible();

    // Keyboard: Enter moves focus into the panel, Esc gives it back to "+2".
    await page.mouse.move(0, 0);
    await expect(dialog).toBeHidden();
    await moreTags(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'angular', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(moreTags(page)).toBeFocused();
  });

  test('a press outside closes the panel opened by a click', async ({ page }) => {
    await openCards(page);
    await moreTags(page).click();
    const dialog = page.getByRole('dialog', { name: 'All tags' });
    await expect(dialog).toBeVisible();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    // Pinned by the click: leaving it with the pointer keeps it open.
    await expect(dialog).toBeVisible();
    await page.getByRole('heading', { level: 1 }).click();
    await expect(dialog).toBeHidden();
  });
});
