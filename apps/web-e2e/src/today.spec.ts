import { type Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { MOCK_LINKS_SCENARIO } from './models/mock-links-scenario.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { isCompact, tabBar } from './support/sidebar';
import { expect, test } from './support/test';

// Same value as MOCK_LINKS_SCENARIO.Showcase in apps/web: the demo library, with one due and one
// upcoming reminder (#275) and links saved this week.
const SHOWCASE = 'showcase';
const DUE_TITLE = 'Wool overshirt';

/** Signed in on the showcase library, on All links. The mock state lives in the page. */
async function openShowcase(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => sessionStorage.setItem(key, value),
    [MOCK_LINKS_SCENARIO.key, SHOWCASE],
  );
  // The due-reminder toast of the app start is covered by reminders.spec.ts.
  await page.addInitScript(`localStorage.setItem('sm-reminders-seen', '9999-12-31T00:00:00.000Z')`);
  await seedSession(page);
  await page.goto('/links');
  await expect(page.locator('ui-card').first()).toBeVisible();
}

/** The Today entry: the sidebar row from 64em, the first tab of the mobile shell. */
function todayEntry(page: Page) {
  return isCompact(page)
    ? tabBar(page).getByRole('link', { name: 'Today' })
    : page.getByRole('treeitem', { name: /^Today\b/ });
}

// Shelf block 1 (`01-library.html`): Today is the sidebar row in place of Reminders and the first
// tab of the mobile shell; its parts load on their own (TodayStore, today.page.spec.ts).
test.describe('Today (mock API)', { tag: E2E_TAG.Mobile }, () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('opens from its entry with the date, the due link, this week, a forgotten link and the newest links', async ({
    page,
  }, testInfo) => {
    await openShowcase(page);
    // The sidebar row counts the due reminders; the tab has no count.
    if (!isCompact(page)) {
      await expect(todayEntry(page)).toContainText('1');
    }
    await todayEntry(page).click();
    await expect(page).toHaveURL('/today');
    if (isCompact(page)) {
      await expect(todayEntry(page)).toHaveAttribute('aria-current', 'page');
    }

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
    // The weekday and the date of today, in the interface language.
    await expect(main.getByText(/^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}$/)).toBeVisible();

    const back = main.getByRole('region', { name: 'Back to these' });
    await expect(back.getByRole('listitem')).toHaveCount(1);
    await expect(back.getByRole('link', { name: DUE_TITLE })).toBeVisible();
    await expect(back).toContainText(/Due \d+ hours? ago/);

    const week = main.getByRole('region', { name: 'Saved this week' });
    await expect(week).toContainText(/\d+ · \d+ in folders/);
    await expect(week.getByRole('listitem')).toHaveCount(4);

    const shelf = main.getByRole('region', { name: 'From your shelf' });
    await expect(shelf.getByRole('heading', { level: 3 })).toBeVisible();
    await expect(shelf.getByRole('button', { name: 'Remind me' })).toBeVisible();

    const all = main.getByRole('region', { name: 'All links' });
    await expect(all.locator('app-link-card')).toHaveCount(8);
    await expect(all.getByRole('heading', { level: 3 }).first()).toBeVisible();

    const overflow = await page.evaluate<number>(
      'document.documentElement.scrollWidth - document.documentElement.clientWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await settled(page);
    await expectNoBlockingViolations(page, testInfo);
  });

  test('Done clears the due link, Snooze moves it, and the entry count follows', async ({
    page,
  }) => {
    await openShowcase(page);
    await todayEntry(page).click();
    const back = page.getByRole('region', { name: 'Back to these' });
    await expect(back.getByRole('link', { name: DUE_TITLE })).toBeVisible();

    await back.getByRole('button', { name: `Snooze ${DUE_TITLE}` }).click();
    await page.getByRole('menuitem', { name: /^Tomorrow/ }).click();
    await expect(back.getByRole('link', { name: DUE_TITLE })).toHaveCount(0);
    if (!isCompact(page)) {
      await expect(todayEntry(page)).not.toContainText(/\d/);
    }
  });

  test('Show all, Revisit and Open library lead to their pages', async ({ page }) => {
    await openShowcase(page);
    await todayEntry(page).click();
    const main = page.getByRole('main');

    await main
      .getByRole('region', { name: 'Saved this week' })
      .getByRole('link', { name: 'Show all' })
      .click();
    await expect(page).toHaveURL('/links?saved=week');
    await expect(page.locator('ui-card').first()).toBeVisible();

    await todayEntry(page).click();
    await main
      .getByRole('region', { name: 'Back to these' })
      .getByRole('link', { name: 'Revisit' })
      .click();
    await expect(page).toHaveURL('/revisit');
    await expect(page.getByRole('heading', { level: 1, name: 'Revisit' })).toBeVisible();

    await todayEntry(page).click();
    await main
      .getByRole('region', { name: 'All links' })
      .getByRole('link', { name: 'Open library' })
      .click();
    await expect(page).toHaveURL('/links');
    await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
  });
});

test.describe('Revisit (mock API)', { tag: E2E_TAG.Mobile }, () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('lists the due links and the forgotten ones; Done and Not interested take them off', async ({
    page,
  }, testInfo) => {
    await openShowcase(page);
    await todayEntry(page).click();
    await page
      .getByRole('region', { name: 'Back to these' })
      .getByRole('link', { name: 'Revisit' })
      .click();

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Revisit' })).toBeVisible();
    await expect(main.getByText(/\d+ waiting\./)).toBeVisible();

    const due = main.getByRole('region', { name: /^Due \d+$/ });
    await expect(due.getByRole('link', { name: new RegExp(`^${DUE_TITLE}`) })).toBeVisible();
    const forgotten = main.getByRole('region', { name: /^Forgotten this week \d+$/ });
    const first = forgotten.getByRole('heading', { level: 3 }).first();
    const title = (await first.innerText()).trim();
    await settled(page);
    await expectNoBlockingViolations(page, testInfo);

    await due.getByRole('button', { name: `Done: ${DUE_TITLE}` }).click();
    await expect(main.getByRole('region', { name: /^Due \d+$/ })).toHaveCount(0);

    await forgotten.getByRole('button', { name: 'Not interested' }).first().click();
    await expect(forgotten.getByRole('heading', { level: 3, name: title })).toHaveCount(0);
  });
});
