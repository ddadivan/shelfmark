import { type Locator, type Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { MOCK_FIXTURE } from './models/mock-fixture.const';
import { openFeed } from './support/a11y-flows';
import { seedSession } from './support/mock-session';
import { expect, test } from './support/test';

// Domain rules (#398) on the mock API: a link's domain puts it into a folder with tags. The mock
// data lives in memory, so each test stays on one page load.

const READING = MOCK_FIXTURE.readingName;
const ANGULAR = 'Angular';

async function openAddLink(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Add link' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add link' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function saveLink(page: Page, url: string): Promise<void> {
  const dialog = await openAddLink(page);
  await dialog.getByLabel('Link', { exact: true }).fill(url);
  await expect(dialog.getByLabel('Title', { exact: true })).not.toHaveValue('');
  await dialog.getByRole('button', { name: 'Save link' }).click();
  await expect(dialog).toBeHidden();
}

/** Fills the rule dialog: the folder from the picker list and one tag, then saves. */
async function fillRule(page: Page, dialog: Locator, folder: string, tag: string): Promise<void> {
  await dialog.getByRole('option', { name: folder, exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Tags' }).fill(tag);
  await page.keyboard.press('Enter');
  await expect(dialog.locator('ui-tag-input').getByText(tag, { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Save rule' }).click();
  await expect(dialog).toBeHidden();
}

/** Saves a youtube.com link, then creates a rule for its domain from the card menu. */
async function ruleFromCard(page: Page): Promise<void> {
  await saveLink(page, 'https://www.youtube.com/watch?v=first');
  await page.mouse.move(0, 0);
  const card = page.locator('ui-card').filter({ hasText: 'youtube.com' }).first();
  await card.getByRole('button', { name: /^Actions for / }).click();
  await page.getByRole('menuitem', { name: 'Create a rule for youtube.com…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add rule' });
  await expect(dialog.getByLabel('Domain', { exact: true })).toHaveValue('youtube.com');
  await fillRule(page, dialog, READING, 'video');
  await expect(page.getByRole('status').filter({ hasText: 'Rule added' })).toBeVisible();
}

test.describe('domain rules (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test(
    'a rule from a card files the next youtube link into its folder with its tag',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await openFeed(page);
      await ruleFromCard(page);

      const dialog = await openAddLink(page);
      await dialog.getByLabel('Link', { exact: true }).fill('https://m.youtube.com/watch?v=second');
      await expect(dialog.getByText(`Rule: youtube.com → ${READING}, #video`)).toBeVisible();
      await expect(dialog.getByLabel('Title', { exact: true })).not.toHaveValue('');
      await dialog.getByRole('button', { name: 'Save link' }).click();
      await expect(dialog).toBeHidden();

      await expect(
        page.getByRole('status').filter({ hasText: `Saved to ${READING}` }),
      ).toBeVisible();
      const card = page.locator('ui-card').filter({ hasText: 'm.youtube.com' }).first();
      await expect(card.getByText('video', { exact: true })).toBeVisible();
    },
  );

  test(
    'a folder chosen in the form wins over the rule; the tag still comes',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await openFeed(page);
      await ruleFromCard(page);

      const dialog = await openAddLink(page);
      await dialog.getByRole('combobox', { name: 'Folder' }).click();
      await page.getByRole('option', { name: `${READING} / ${ANGULAR}`, exact: true }).click();
      await dialog.getByLabel('Link', { exact: true }).fill('https://youtube.com/watch?v=third');
      await expect(dialog.getByText('Rule: youtube.com → #video')).toBeVisible();
      await expect(dialog.getByLabel('Title', { exact: true })).not.toHaveValue('');
      await dialog.getByRole('button', { name: 'Save link' }).click();
      await expect(dialog).toBeHidden();

      await expect(
        page.getByRole('status').filter({ hasText: `Saved to ${READING} / ${ANGULAR}` }),
      ).toBeVisible();
    },
  );

  test(
    'Settings › Library lists, adds and deletes rules with Undo',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await seedSession(page);
      await page.goto('/settings/library');
      const section = page.getByRole('group', { name: 'Rules' });
      await expect(section.getByText('No rules yet.')).toBeVisible();

      await section.getByRole('button', { name: 'Add rule' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add rule' });
      const domain = dialog.getByLabel('Domain', { exact: true });
      await domain.fill('https://WWW.Vimeo.com/123');
      await domain.blur();
      await expect(domain).toHaveValue('vimeo.com');
      await fillRule(page, dialog, READING, 'clip');

      const row = section.getByRole('listitem').filter({ hasText: 'vimeo.com' });
      await expect(row).toContainText(READING);
      await expect(row).toContainText('clip');

      await row.getByRole('button', { name: 'Actions for vimeo.com' }).click();
      await page.getByRole('menuitem', { name: 'Delete rule' }).click();
      await expect(section.getByText('No rules yet.')).toBeVisible();
      await page
        .getByRole('status')
        .filter({ hasText: 'Rule deleted' })
        .getByRole('button', { name: 'Undo' })
        .click();
      await expect(section.getByRole('listitem').filter({ hasText: 'vimeo.com' })).toBeVisible();

      const overflow = await page.evaluate<number>(
        '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
      );
      expect(overflow).toBeLessThanOrEqual(0);
    },
  );
});
