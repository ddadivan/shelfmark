import type { Locator } from '@playwright/test';
import { expect, test } from './support/test';
import { openFeed } from './support/a11y-flows';
import { expectVisibleFocus } from './support/keyboard';

const outline = (target: Locator): Promise<string | undefined> =>
  target.evaluate((el) => el.ownerDocument.defaultView?.getComputedStyle(el).outlineStyle);

/**
 * Hotfix 2.4.1: after a click on something that takes no focus (a heading, empty space), Chrome
 * counts focus moved by code as `:focus-visible`, so a dialog's control showed the ring before any
 * key was pressed. The ring stays off until a key, and the first Tab brings it back.
 */
test.describe('focus ring after a click (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.skip(({ isMobile }) => isMobile, 'the desktop project covers the pointer case');

  test('focus moved by code after a click shows no ring; a key brings it back', async ({
    page,
  }) => {
    await openFeed(page);
    const heading = page.getByRole('heading', { level: 1 });
    const button = page.getByRole('button', { name: 'Add link' }).first();

    await heading.click();
    await button.focus();
    await expect(button).toBeFocused();
    expect(await button.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    expect(await outline(button)).toBe('none');

    await page.keyboard.press('Tab');
    await expectVisibleFocus(page);
  });
});
