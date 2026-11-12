import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { openFeed } from './support/a11y-flows';

// `angular.dev/overview` is the mock's saved link (the duplicate fixture).
const PASTE = [
  'youtube.com/watch?v=signals-deep-dive',
  'https://angular.dev/guide/forms/signals',
  'dev.to/ngrx/signalstore-testing',
  'https://angular.dev/overview',
  'remember to check the RFC',
].join('\n');

/** Puts `text` on the clipboard (the browser context grants clipboard access). */
async function copy(page: Page, text: string): Promise<void> {
  // String script: this project has no DOM lib, and the code runs in the browser anyway.
  await page.evaluate(`navigator.clipboard.writeText(${JSON.stringify(text)})`);
}

/** A paste of `text` on the focused field, the way the browser fires it. */
async function pasteInto(field: Locator, text: string): Promise<void> {
  await field.focus();
  await field.page().evaluate(
    `(() => {
      const data = new DataTransfer();
      data.setData('text/plain', ${JSON.stringify(text)});
      document.activeElement.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
      );
    })()`,
  );
}

function list(page: Page): Locator {
  return page.getByRole('dialog', { name: /^Add (\d+ links?|links)$/ });
}

test.describe('paste several links (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('Cmd/Ctrl+V in the library opens the list; saving lands the links with a summary toast and Undo', async ({
    page,
  }) => {
    await openFeed(page);
    await copy(page, PASTE);
    await page.locator('body').click({ position: { x: 1, y: 1 } });

    await page.keyboard.press('ControlOrMeta+V');

    const dialog = list(page);
    await expect(page.getByRole('dialog', { name: 'Add 3 links' })).toBeVisible();
    await expect(dialog.getByText('Found 4 links in what you pasted.')).toBeVisible();
    await expect(dialog.getByText('1 is already on your shelf.')).toBeVisible();
    await expect(
      dialog.getByRole('checkbox', { name: 'Page on angular.dev' }).first(),
    ).toBeChecked();
    const saved = dialog.getByRole('listitem').filter({ hasText: 'Already saved' });
    await expect(saved.getByRole('checkbox')).not.toBeChecked();
    await expect(dialog.getByText('“remember to check the RFC”')).toBeVisible();
    await expect(dialog.getByText('Not a link, skipped')).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: 'Select all' })).toBeFocused();

    await dialog.getByRole('button', { name: 'Remove Page on youtube.com' }).click();
    await expect(page.getByRole('dialog', { name: 'Add 2 links' })).toBeVisible();
    const tags = dialog.getByRole('combobox', { name: 'Tags for all' });
    await tags.fill('pasted');
    await tags.press('Enter');
    await dialog.getByRole('button', { name: 'Save 2 links' }).click();

    await expect(dialog).toBeHidden();
    const toast = page.getByRole('status').filter({ hasText: '2 links saved to Unsorted' });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Titles and previews are still loading');
    const cards = page.locator('ui-card');
    await expect(cards.nth(0)).toContainText('angular.dev');
    await expect(cards.nth(1)).toContainText('dev.to');
    await expect(page.locator('li.library__landed').first()).toBeVisible();

    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(cards.nth(0)).not.toContainText('Page on angular.dev');
    await expect(page.getByText('Page on dev.to')).toHaveCount(0);
  });

  test('pasting several links into the Link field turns Add link into the list', async ({
    page,
  }) => {
    await openFeed(page);
    await page.getByRole('button', { name: 'Add link' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add link' });

    await pasteInto(
      dialog.getByLabel('Link', { exact: true }),
      'read https://example.org/a and example.net/b, then www.example.com',
    );

    const many = page.getByRole('dialog', { name: 'Add 3 links' });
    await expect(many).toBeVisible();
    await expect(many.getByLabel('Folder for all')).toBeVisible();
    await expect(many.getByRole('button', { name: 'Save 3 links' })).toBeEnabled();
  });

  test('"Add several links" in Add link switches to a text area that leads into the list (#315)', async ({
    page,
  }) => {
    await openFeed(page);
    await page.getByRole('button', { name: 'Add link' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add link' });
    await expect(dialog.getByText('Have several links? Paste them all at once')).toBeVisible();

    await dialog.getByRole('button', { name: 'Add several links' }).click();
    const several = page.getByRole('dialog', { name: 'Add several links' });
    const text = several.getByRole('textbox', {
      name: 'Paste links, one per line or inside any text',
    });
    await expect(text).toBeFocused();

    // Back to one link and in again: the address field gets focus back.
    await several.getByRole('button', { name: 'One link' }).click();
    await expect(dialog.getByLabel('Link', { exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: 'Add several links' }).click();

    await text.fill('https://example.org/a\nexample.net/b\nsee www.example.com too');
    await several.getByRole('button', { name: 'Find links' }).click();

    const many = page.getByRole('dialog', { name: 'Add 3 links' });
    await expect(many).toBeVisible();
    await expect(many.locator('.paste-many__row')).toHaveCount(3);
    await expect(many.getByRole('button', { name: 'Save 3 links' })).toBeEnabled();
  });

  test('pastes into the several-links text area stay in it until Find links (#335)', async ({
    page,
  }) => {
    await openFeed(page);
    await page.getByRole('button', { name: 'Add link' }).first().click();
    await page
      .getByRole('dialog', { name: 'Add link' })
      .getByRole('button', { name: 'Add several links' })
      .click();
    const text = page
      .getByRole('dialog', { name: 'Add several links' })
      .getByRole('textbox', { name: 'Paste links, one per line or inside any text' });

    await pasteInto(text, 'https://example.org/a https://example.org/b');
    await expect(text).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Add 2 links' })).toHaveCount(0);
    // A synthetic paste inserts nothing, so type the text like several pastes and edits would.
    await text.fill('https://example.org/a https://example.org/b');
    await text.press('Enter');
    await text.pressSequentially('https://example.org/c');
    await expect(text).toBeFocused();

    await page
      .getByRole('dialog', { name: 'Add several links' })
      .getByRole('button', { name: 'Find links' })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Add 3 links' }).locator('.paste-many__row'),
    ).toHaveCount(3);
  });

  test('more than 100 links: the first 100 are listed and a note points to Import', async ({
    page,
  }) => {
    await openFeed(page);
    await copy(
      page,
      Array.from({ length: 104 }, (_, index) => `https://example.org/post-${index}`).join('\n'),
    );
    await page.locator('body').click({ position: { x: 1, y: 1 } });

    await page.keyboard.press('ControlOrMeta+V');

    const dialog = page.getByRole('dialog', { name: 'Add 100 links' });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(
        '4 more links were left out: up to 100 links at a time. Bigger lists go to Import as text.',
      ),
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Save 100 links' })).toBeVisible();
  });

  test('a paste in a field or without a link does not open Add link', async ({ page }) => {
    await openFeed(page);
    await copy(page, 'just a note, no address');
    await page.locator('body').click({ position: { x: 1, y: 1 } });

    await page.keyboard.press('ControlOrMeta+V');

    await expect(list(page)).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('reduced motion: the saved links fade in instead of dropping', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openFeed(page);
    await copy(page, 'https://example.org/one\nhttps://example.org/two');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.keyboard.press('ControlOrMeta+V');
    const dialog = page.getByRole('dialog', { name: 'Add 2 links' });
    await dialog.getByRole('button', { name: 'Save 2 links' }).click();

    const landed = page.locator('li.library__landed').first();
    await expect(landed).toBeVisible();
    await expect(landed).toHaveCSS('animation-name', 'ui-reveal, ui-land-ring');
  });
});
