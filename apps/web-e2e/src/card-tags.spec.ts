import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { seedSession } from './support/mock-session';
import { E2E_TAG } from './models/e2e-tag.const';

// The showcase library (demo seed) has "Signals vs RxJS: when to use which" with three tags.
const TITLE = 'Signals vs RxJS: when to use which';
const TAGS = ['angular', 'javascript', 'reading'];

async function openCards(page: Page, path = '/links?tag=javascript'): Promise<void> {
  await page.addInitScript(() => sessionStorage.setItem('sm-mock-links-scenario', 'showcase'));
  await seedSession(page);
  await page.goto(path);
  await expect(page.locator('ui-card').first()).toBeVisible();
}

function card(page: Page) {
  return page.locator('ui-card', { hasText: TITLE });
}

/**
 * Tag chips on cards in view whose name is cut. Whole pixels miss an overflow under one pixel
 * (the browser already draws "angul…"), so the text width is compared with its box as well.
 */
function cutTags(page: Page): Promise<string[]> {
  return page.locator('app-link-card-tags > ui-chip .ui-chip__label').evaluateAll((labels) =>
    labels
      .filter((label) => {
        const box = label.getBoundingClientRect();
        const height = label.ownerDocument.defaultView?.innerHeight ?? 0;
        if (box.bottom < 0 || box.top > height) return false;
        const range = label.ownerDocument.createRange();
        range.selectNodeContents(label);
        return (
          label.scrollWidth > label.clientWidth ||
          range.getBoundingClientRect().width - box.width > 0.01
        );
      })
      .map((label) => label.textContent?.trim() ?? ''),
  );
}

/** Scrolls the library feed from the top to the end, collecting cut tags at every step. */
async function cutTagsWhileScrolling(page: Page): Promise<string[]> {
  const found: string[] = [];
  const feed = page.locator('.library__scroll');
  await feed.evaluate((element) => element.scrollTo({ top: 0 }));
  for (let step = 0; step < 30; step++) {
    await page.waitForTimeout(150);
    found.push(...(await cutTags(page)));
    const done = await feed.evaluate((element) => {
      const end = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
      element.scrollBy({ top: element.clientHeight * 0.8 });
      return end;
    });
    if (done) break;
  }
  return found;
}

test.describe('card tags (Shelf hashtags, mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  // "+N" and its popover (hover, Esc, a press outside) are covered by
  // apps/web/src/app/features/links/components/link-card-tags/link-card-tags.component.spec.ts.
  test(
    'the card shows up to three whole "#tag"s and a tag filters the library',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await openCards(page);
      const tags = card(page).locator('app-link-card-tags');
      await expect(tags.getByRole('button')).toHaveText(TAGS.map((tag) => `#${tag}`));
      // The "#" is for the eye: the accessible name is the tag itself.
      await expect(tags.getByRole('button', { name: TAGS[0], exact: true })).toBeVisible();
      await expect(tags.getByRole('button', { name: /more tags?:/ })).toHaveCount(0);
      expect(await cutTags(page)).toEqual([]);

      await tags.getByRole('button', { name: 'reading', exact: true }).click();
      await expect(page).toHaveURL(/[?&]tag=reading(&|$)/);
    },
  );

  test('no tag is ever cut on a card: at several widths, after a resize and while scrolling', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await openCards(page, '/links');
    await expect(page.locator('app-link-card-tags').first()).toBeVisible();
    // Tight widths where a tag and the folder chip only just fit or only just miss.
    for (const width of [1280, 1225, 1180, 1100, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await cutTagsWhileScrolling(page), `cut tags at ${width}px`).toEqual([]);
    }
  });
});
