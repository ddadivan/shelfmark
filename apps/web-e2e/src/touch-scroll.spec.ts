import { type Locator, type Page } from '@playwright/test';
import { seedSession } from './support/mock-session';
import { documentScrollTop, mainScrollTop, makePageTall, SHELL_MAIN } from './support/scroll';
import { settled } from './support/settled';
import { isCompact, tabBar } from './support/sidebar';
import { expect, test } from './support/test';
import { Finger } from './support/touch';
import { E2E_TAG } from './models/e2e-tag.const';

/** The middle of a locator's box. */
async function centre(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 };
}

/** A finger swipe of `dy` px (negative = up, which scrolls the content down). */
async function swipe(page: Page, from: { x: number; y: number }, dy: number): Promise<void> {
  const finger = await Finger.down(page, from);
  await finger.move({ x: from.x, y: from.y + dy }, 10);
  await finger.up();
}

/** The area that scrolls the feed: the main column in the mobile shell, the feed itself on desktop. */
function feedScrollTop(page: Page): Promise<number> {
  return isCompact(page)
    ? mainScrollTop(page)
    : page.evaluate<number>(`document.querySelector('.library__scroll').scrollTop`);
}

// #352: the page must not move under the finger on a tablet or phone. The app shell is exactly
// the viewport and never scrolls the document; only its inner areas scroll.
test.describe('touch scrolling (mock API)', { tag: E2E_TAG.Mobile }, () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.describe('in the app shell', () => {
    test.beforeEach(async ({ page }) => {
      await seedSession(page);
      await page.goto('/links');
      await expect(page.locator('ui-card').first()).toBeVisible();
    });

    test('locks the document and turns off the rubber band', async ({ page }) => {
      const styles = await page.evaluate<string[]>(`(() => {
        const html = getComputedStyle(document.documentElement);
        const body = getComputedStyle(document.body);
        return [html.overflowY, body.overflowY, html.overscrollBehaviorY, body.overscrollBehaviorY];
      })()`);
      expect(styles).toEqual(['hidden', 'hidden', 'none', 'none']);
      const shellHeight = await page.evaluate<number>(
        `document.querySelector('app-shell').getBoundingClientRect().height`,
      );
      expect(shellHeight).toBe(page.viewportSize()?.height);
      expect(
        await page.evaluate<string>(
          `getComputedStyle(document.querySelector('${SHELL_MAIN}')).overscrollBehaviorY`,
        ),
      ).toBe('contain');
    });

    test('a wheel scrolls the feed, never the document', async ({ page }) => {
      await makePageTall(page, 3000);
      await page.addStyleTag({
        content: '.library__scroll > :first-child { min-block-size: 3000px; }',
      });
      const card = page.locator('ui-card').first();
      await page.mouse.move((await centre(card)).x, (await centre(card)).y);
      await page.mouse.wheel(0, 600);

      await expect.poll(() => feedScrollTop(page)).toBeGreaterThan(100);
      expect(await documentScrollTop(page)).toBe(0);
    });

    test('a swipe scrolls the main column and the document stays put', async ({ page }) => {
      test.skip(!isCompact(page), 'touch: the tablet and phone projects');
      await makePageTall(page, 3000);
      const start = await centre(page.locator('ui-card').first());

      await swipe(page, start, -300);
      await expect.poll(() => mainScrollTop(page)).toBeGreaterThan(50);
      expect(await documentScrollTop(page)).toBe(0);

      // Pulling down at the top (and past the end) moves nothing either.
      await page.evaluate(`document.querySelector('${SHELL_MAIN}').scrollTo(0, 0)`);
      await swipe(page, start, 300);
      expect(await documentScrollTop(page)).toBe(0);
      const bar = await tabBar(page).boundingBox();
      expect(bar?.y ?? 0).toBeGreaterThan((page.viewportSize()?.height ?? 0) / 2);
    });

    test('a dialog still opens, scrolls inside and a text field takes focus', async ({ page }) => {
      const addLink = isCompact(page)
        ? tabBar(page).getByRole('button', { name: 'Add link' })
        : page.getByRole('button', { name: 'Add link' });
      await addLink.click();
      const dialog = page.getByRole('dialog', { name: 'Add link' });
      await expect(dialog).toBeVisible();
      await settled(page);

      const field = dialog.getByLabel('Link', { exact: true });
      await field.click();
      await expect(field).toBeFocused();

      // Room to scroll inside the dialog (or bottom sheet) body, whatever its content height.
      const body = dialog.locator('.ui-dialog__body');
      await page.addStyleTag({ content: '.ui-dialog__body > * { min-block-size: 2000px; }' });
      await expect.poll(() => body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      const box = await body.boundingBox();
      const point = { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + 60 };
      if (isCompact(page)) {
        await swipe(page, { x: point.x, y: point.y + 200 }, -200);
      } else {
        await page.mouse.move(point.x, point.y);
        await page.mouse.wheel(0, 400);
      }

      await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(20);
      expect(await documentScrollTop(page)).toBe(0);
      expect(await mainScrollTop(page)).toBe(0);
    });

    test('a new page opens at the top of the main column', async ({ page }) => {
      test.skip(!isCompact(page), 'the mobile shell scrolls the main column');
      await makePageTall(page, 3000);
      await page.evaluate(`document.querySelector('${SHELL_MAIN}').scrollTo(0, 800)`);
      await expect.poll(() => mainScrollTop(page)).toBeGreaterThan(500);

      await tabBar(page).getByRole('link', { name: 'Tags' }).click();
      await expect(page).toHaveURL('/tags');
      await expect.poll(() => mainScrollTop(page)).toBe(0);
    });
  });

  test('pages outside the shell keep the document scroll, without the rubber band', async ({
    page,
  }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const html = await page.evaluate<string[]>(`(() => {
      const style = getComputedStyle(document.documentElement);
      return [style.overflowY, style.overscrollBehaviorY];
    })()`);
    expect(html).toEqual(['visible', 'none']);

    await page.evaluate('window.scrollTo(0, 400)');
    await expect.poll(() => documentScrollTop(page)).toBeGreaterThan(100);
  });
});
