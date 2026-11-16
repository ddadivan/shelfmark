import { type Locator, type Page } from '@playwright/test';
import { openFeed } from './support/a11y-flows';
import { isCompact, openSidebar, viewEntry } from './support/sidebar';
import { expect, test } from './support/test';
import { E2E_TAG } from './models/e2e-tag.const';

// Same value as MOCK_LINKS_SCENARIO_KEY / MOCK_LINKS_SCENARIO.Showcase in apps/web: the mock
// starts from the demo library, which has one due and one upcoming reminder (#275).
const SCENARIO_KEY = 'sm-mock-links-scenario';
const SHOWCASE = 'showcase';
const DUE_TITLE = 'Wool overshirt';
const UPCOMING_TITLE = "TypeScript: the complete developer's guide";

/** Opens the Reminders page from the sidebar row (the Library tile on the mobile shell). */
async function openReminders(page: Page): Promise<void> {
  await openSidebar(page);
  await viewEntry(page, 'Reminders').click();
  await expect(page).toHaveURL('/reminders');
  await expect(page.getByRole('heading', { level: 1, name: 'Reminders' })).toBeVisible();
}

/** A group of the Reminders page ("Due", "Later", ...) by its title. */
function group(page: Page, title: string): Locator {
  return page.getByRole('group', { name: title, exact: true });
}

/** The row of a link on the Reminders page. */
function reminderRow(page: Page, title: string): Locator {
  return page.locator('app-reminder-row').filter({ hasText: title });
}

// The mock state lives in the page: every step navigates inside the app, never with `page.goto`.
test.describe('reminders (mock API)', { tag: E2E_TAG.Phone }, () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('sets a reminder from the card menu with a preset; it is listed as upcoming', async ({
    page,
  }) => {
    await openFeed(page);
    const card = page.locator('ui-card').first();
    const title = await card.getByRole('heading').innerText();
    await card.getByRole('button', { name: /^Actions for / }).click();
    await page.getByRole('menuitem', { name: 'Remind me…' }).click();

    const dialog = page.getByRole('dialog', { name: 'Remind me' });
    await expect(dialog).toContainText(title);
    // The presets bleed out for a wider hover; the scrolling body must not scroll sideways.
    const sideways = await dialog
      .locator('.ui-dialog__body')
      .evaluate((body) => body.scrollWidth - body.clientWidth);
    expect(sideways).toBeLessThanOrEqual(0);
    await expect(dialog).toContainText('Times are in your time zone');
    await dialog.getByRole('button', { name: /^In a month/ }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(/^Reminder set for /)).toBeVisible();
    // The card shows the time in its bell chip.
    await expect(card.locator('ui-badge').filter({ hasText: /\d/ })).toBeVisible();

    await openReminders(page);
    await expect(group(page, 'Later')).toContainText(title);
    await expect(page.getByText('Nothing is due right now')).toBeVisible();
  });

  test('picks a day in the calendar and removes the reminder again', async ({ page }) => {
    await openFeed(page);
    const card = page.locator('ui-card').first();
    const title = await card.getByRole('heading').innerText();
    await card.getByRole('button', { name: /^Actions for / }).click();
    await page.getByRole('menuitem', { name: 'Remind me…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Remind me' });
    await dialog.getByRole('button', { name: 'Pick date and time…' }).click();
    await dialog.getByRole('button', { name: 'Next month' }).click();
    // Any day of next month lies ahead: the 15th always exists.
    await dialog
      .getByRole('gridcell')
      .getByRole('button', { name: /\b15\b/ })
      .first()
      .click();
    await dialog.getByRole('button', { name: /^Remind me / }).click();
    await expect(dialog).toBeHidden();

    await card.getByRole('button', { name: /^Actions for / }).click();
    await page.getByRole('menuitem', { name: 'Change reminder…' }).click();
    await expect(dialog).toContainText('Current reminder:');
    await dialog.getByRole('button', { name: 'Remove reminder' }).click();
    await expect(page.getByText('Reminder removed')).toBeVisible();

    await openReminders(page);
    await expect(page.getByText('No reminders yet')).toBeVisible();
    await expect(reminderRow(page, title)).toHaveCount(0);
  });

  test('a due reminder shows the badge and one note on open; Snooze and Done', async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => sessionStorage.setItem(key, value),
      [SCENARIO_KEY, SHOWCASE],
    );
    await openFeed(page);
    const note = page.getByRole('status').filter({ hasText: 'A reminder is due' });
    await expect(note).toContainText(DUE_TITLE);

    await openSidebar(page);
    // The badge: the count of the sidebar row, or "1 due" on the Library tile.
    await expect(viewEntry(page, 'Reminders')).toContainText(isCompact(page) ? '1 due' : '1');

    // "Show" on the note opens the Reminders page.
    await note.getByRole('button', { name: 'Show' }).click();
    await expect(page).toHaveURL('/reminders');
    await expect(note).toHaveCount(0);
    await expect(group(page, 'Due')).toContainText(DUE_TITLE);
    await expect(reminderRow(page, DUE_TITLE)).toContainText(/Due \d+ hours? ago/);
    await expect(reminderRow(page, UPCOMING_TITLE)).toBeVisible();

    // Snooze the due one to tomorrow: it leaves "Due".
    await page.getByRole('button', { name: `Snooze the reminder of ${DUE_TITLE}` }).click();
    await page.getByRole('menuitem', { name: /^Tomorrow/ }).click();
    await expect(group(page, 'Tomorrow')).toContainText(DUE_TITLE);
    await expect(group(page, 'Due')).toHaveCount(0);
    await expect(page.getByText('Nothing is due right now')).toBeVisible();

    // Done clears the upcoming one.
    await page
      .getByRole('button', { name: `Mark the reminder of ${UPCOMING_TITLE} as done` })
      .click();
    await expect(reminderRow(page, UPCOMING_TITLE)).toHaveCount(0);

    // The note is asked for once per session: back in the feed, it does not come again.
    await openSidebar(page);
    await viewEntry(page, 'All links').click();
    await expect(page.locator('ui-card').first()).toBeVisible();
    await expect(note).toHaveCount(0);
  });
});

// Desktop only: the checkbox path; the phone selection (long press) is covered by bulk-actions.spec.ts.
test.describe('reminders bulk (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('bulk Remind sets one reminder on the picked links', async ({ page }) => {
    await openFeed(page);
    const cards = page.locator('ui-card');
    for (const index of [0, 1]) {
      await cards.nth(index).hover();
      await cards.nth(index).locator('ui-checkbox .ui-checkbox__box').click();
    }
    await page
      .getByRole('toolbar', { name: /^Actions for \d+ selected/ })
      .getByRole('button', { name: 'Remind' })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Remind me about 2 links' });
    await dialog.getByRole('button', { name: /^In a month/ }).click();
    await expect(page.getByText(/^Reminder set for /)).toBeVisible();

    await openReminders(page);
    await expect(page.locator('app-reminder-row')).toHaveCount(2);
  });
});
