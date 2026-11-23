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

function moreTags(page: Page) {
  return card(page).getByRole('button', { name: /more tags?:/ });
}

/**
 * What the card shows: the first tag while it fits whole, then "+N" for the tags not on the card
 * ("Other tags"); when the first tag would be cut, only "+N" for every tag ("All tags").
 */
async function expected(page: Page) {
  await expect(moreTags(page)).toBeVisible();
  const footer = card(page).locator('app-link-card-tags');
  const firstShown = await footer.getByRole('button', { name: TAGS[0], exact: true }).isVisible();
  const listed = firstShown ? TAGS.slice(1) : TAGS;
  return {
    listed,
    heading: firstShown ? 'Other tags' : 'All tags',
    name: `${listed.length} more tags: ${listed.join(', ')}`,
  };
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

test.describe('card tags (hotfix 2.2.1, mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test(
    'the footer shows whole tags only; "+N" opens the tags not on the card and a tag filters the library',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await openCards(page);
      const { listed, heading, name } = await expected(page);
      await expect(moreTags(page)).toHaveAccessibleName(name);
      await expect(moreTags(page)).toHaveText(`+${listed.length}`);
      await expect(moreTags(page)).toHaveAttribute('aria-haspopup', 'dialog');
      await expect(moreTags(page)).toHaveAttribute('aria-expanded', 'false');
      expect(await cutTags(page)).toEqual([]);

      // Hover on a desktop pointer; a tap on touch, where nothing hovers.
      const touch = await page.evaluate<boolean>("matchMedia('(hover: none)').matches");
      if (touch) {
        await moreTags(page).tap();
      } else {
        await moreTags(page).hover();
      }
      const dialog = page.getByRole('dialog', { name: heading });
      await expect(dialog).toBeVisible();
      await expect(moreTags(page)).toHaveAttribute('aria-expanded', 'true');
      await expect(dialog.getByRole('button')).toHaveText(listed);
      // The panel opens above "+N".
      const panel = await dialog.boundingBox();
      const trigger = await moreTags(page).boundingBox();
      expect(panel && trigger && panel.y + panel.height <= trigger.y + 1).toBe(true);

      await dialog.getByRole('button', { name: 'reading', exact: true }).click();
      await expect(page).toHaveURL(/[?&]tag=reading(&|$)/);
      await expect(dialog).toBeHidden();
    },
  );

  test('the pointer can move from "+N" into the panel; Esc closes it on "+N"', async ({ page }) => {
    await openCards(page);
    const { listed, heading } = await expected(page);
    await moreTags(page).hover();
    const dialog = page.getByRole('dialog', { name: heading });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'javascript', exact: true }).hover();
    await page.waitForTimeout(400);
    await expect(dialog).toBeVisible();

    // Keyboard: Enter moves focus into the panel, Esc gives it back to "+N".
    await page.mouse.move(0, 0);
    await expect(dialog).toBeHidden();
    await moreTags(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: listed[0], exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(moreTags(page)).toBeFocused();
  });

  test('a press outside closes the panel opened by a click', async ({ page }) => {
    await openCards(page);
    const { heading } = await expected(page);
    await moreTags(page).click();
    const dialog = page.getByRole('dialog', { name: heading });
    await expect(dialog).toBeVisible();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    // Pinned by the click: leaving it with the pointer keeps it open.
    await expect(dialog).toBeVisible();
    await page.getByRole('heading', { level: 1 }).click();
    await expect(dialog).toBeHidden();
  });

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
