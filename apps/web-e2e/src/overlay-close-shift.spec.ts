import type { Locator, Page } from '@playwright/test';
import { expect, test } from './support/test';
import { openCardEdit } from './support/a11y-flows';
import { seedSession } from './support/mock-session';

// In-page scripts are strings: this project has no DOM typings (see also landing.spec.ts).

// Collects layout shifts (without recent input) from now on, in `window.__shifts`.
async function observeShifts(page: Page): Promise<void> {
  await page.evaluate(`
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__shifts.push(entry.value);
      }
    }).observe({ type: 'layout-shift', buffered: false });
  `);
}

// Records every moment a moved overlay host (menu, select popup) is a visible block outside the
// overlay container: the CDK puts it back into the page on close, and it must stay hidden there.
async function watchStrayHosts(page: Page): Promise<void> {
  await page.evaluate(`
    window.__stray = [];
    new MutationObserver(() => {
      for (const host of document.querySelectorAll('ui-menu, .ui-select__popup')) {
        if (!host.closest('.cdk-overlay-container') && getComputedStyle(host).display !== 'none') {
          window.__stray.push(host.tagName.toLowerCase() + '.' + host.className);
        }
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true });
  `);
}

async function strayHosts(page: Page): Promise<string[]> {
  return page.evaluate<string[]>('window.__stray');
}

async function shiftTotal(page: Page): Promise<number> {
  // Layout shifts are reported asynchronously: wait two frames first.
  await page.evaluate(
    'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
  );
  const shifts = await page.evaluate<number[]>('window.__shifts');
  return shifts.reduce((sum, value) => sum + value, 0);
}

async function boxes(targets: readonly Locator[]): Promise<unknown[]> {
  return Promise.all(targets.map((target) => target.boundingBox()));
}

test.describe('overlays do not move content when an outside click closes them (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await page.goto('/links');
    await expect(page.locator('ui-card').first()).toBeVisible();
  });

  test('account menu: the header stays put', async ({ page }) => {
    const header = page.getByRole('banner');
    const trigger = header.getByRole('button', { name: 'Account menu' });
    const watched = [trigger, header.locator('.shell__name'), header.getByRole('button').first()];
    await expect(trigger).toBeVisible();
    const before = await boxes(watched);
    await observeShifts(page);
    await watchStrayHosts(page);

    await trigger.click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.getByRole('main').click({ position: { x: 4, y: 4 } });
    await expect(page.getByRole('menu')).toBeHidden();

    expect(await boxes(watched)).toEqual(before);
    expect(await shiftTotal(page)).toBe(0);
    expect(await strayHosts(page)).toEqual([]);
  });

  test('folder select in the edit dialog: the dialog stays put', async ({ page }) => {
    const dialog = await openCardEdit(page);
    const select = dialog.getByRole('combobox', { name: 'Folder' });
    const watched = [select, dialog.getByLabel('Title', { exact: true }), dialog];
    await page.waitForTimeout(500);
    const before = await boxes(watched);
    await observeShifts(page);
    await watchStrayHosts(page);

    await select.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await dialog.getByRole('heading', { name: 'Edit link' }).click();
    await expect(page.getByRole('listbox')).toBeHidden();

    expect(await boxes(watched)).toEqual(before);
    expect(await shiftTotal(page)).toBe(0);
    expect(await strayHosts(page)).toEqual([]);
  });
});
