import { expect, type Page } from '@playwright/test';
import { openSignedIn } from '../../src/support/a11y-flows';
import { SEARCH_BUTTON, SEARCH_FIELD_NAME } from '../../src/support/search-button';

// The screens of the help article screenshots, on the mock data (the same flows as the e2e specs).
// Each one gets the window ready; the whole window is captured.

// Same values as MOCK_LINKS_SCENARIO_KEY and its Showcase scenario (apps/web).
const SCENARIO_KEY = 'sm-mock-links-scenario';
const SHOWCASE = 'showcase';
// Same values as MOCK_AI_STORAGE_KEY in apps/web: the mock AI account with Ask on.
const MOCK_AI_KEY = 'sm-mock-ai';
const AI_SEEDED_FLAG = 'help-media-ai-seeded';
const AI_ACCOUNT = JSON.stringify({
  settings: { enabled: true, summaries: true, ask: true, meaningSearch: false },
  introSeen: true,
});
const WAIT = { timeout: 40_000 } as const;

/** A Settings page (`/settings/<section>`) with its heading. */
export async function settingsScreen(page: Page, section: string, heading: string): Promise<void> {
  await openSignedIn(page, `/settings/${section}`);
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible(WAIT);
}

/** The Import page: the steps and the drop area. */
export async function importScreen(page: Page): Promise<void> {
  await openSignedIn(page, '/import');
  await expect(page.getByRole('heading', { level: 1, name: 'Import bookmarks' })).toBeVisible(WAIT);
}

/** The demo library: a filled shelf with a due reminder and AI summaries on the cards. */
async function useShowcase(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => sessionStorage.setItem(key, value),
    [SCENARIO_KEY, SHOWCASE],
  );
}

/** The signed-in library feed (slower to start than the e2e default allows). */
async function openFeed(page: Page): Promise<void> {
  await openSignedIn(page, '/links');
  await expect(page.locator('ui-card').first()).toBeVisible(WAIT);
}

/** Today in the demo library: due reminders, saved this week, a link from the shelf. */
export async function todayScreen(page: Page): Promise<void> {
  await useShowcase(page);
  await openSignedIn(page, '/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible(WAIT);
  await expect(page.locator('app-link-card').first()).toBeVisible(WAIT);
}

/** Ask with a finished answer and the links it found. */
export async function askChatScreen(page: Page): Promise<void> {
  await useShowcase(page);
  await page.addInitScript(
    ([key, flag, value]) => {
      localStorage.setItem('sm-extension-banner-dismissed', '1');
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, '1');
        localStorage.setItem(key, value);
      }
    },
    [MOCK_AI_KEY, AI_SEEDED_FLAG, AI_ACCOUNT],
  );
  await openSignedIn(page, '/ask');
  const main = page.locator('.ask-page__main');
  const field = main.getByRole('textbox', { name: 'Ask about your links' });
  await expect(field).toBeVisible(WAIT);
  await field.fill('Find my design links');
  await field.press('Enter');
  const cards = main.getByRole('list', { name: 'Links found' });
  await expect(cards.getByRole('listitem').first()).toBeVisible(WAIT);
  await expect(main.getByRole('button', { name: 'Stop' })).toBeHidden(WAIT);
}

/** The feed while searching a word: the matching cards with the words marked. */
export async function searchScreen(page: Page): Promise<void> {
  await useShowcase(page);
  await openFeed(page);
  const field = page.getByRole('combobox', { name: SEARCH_FIELD_NAME });
  if (!(await field.isVisible())) {
    await page.getByRole('button', { name: SEARCH_BUTTON }).first().click();
  }
  await field.fill('angular');
  await expect(page.locator('app-link-card').first()).toBeVisible(WAIT);
}
