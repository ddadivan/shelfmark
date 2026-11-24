import type { Locator, Page } from '@playwright/test';
import { seedSession } from '../src/support/mock-session';
import { expect, expectScreen, test } from './support/visual-test';

// Same values as the e2e Ask spec: the demo library and an AI account with Ask on.
const SCENARIO_KEY = 'sm-mock-links-scenario';
const SHOWCASE = 'showcase';
const MOCK_AI_KEY = 'sm-mock-ai';

async function openAsk(page: Page): Promise<Locator> {
  const account = { settings: { enabled: true, ask: true }, introSeen: true };
  await page.addInitScript(
    ([scenarioKey, scenario, key, value]) => {
      sessionStorage.setItem(scenarioKey, scenario);
      localStorage.setItem(key, value);
    },
    [SCENARIO_KEY, SHOWCASE, MOCK_AI_KEY, JSON.stringify(account)],
  );
  await seedSession(page);
  // Ask history: `/ask` is the page on every width (the list beside the chat from 64em, the
  // tab page in the mobile shell).
  await page.goto('/ask');
  const main = page.locator('.ask-page__main');
  await expect(main.getByRole('textbox', { name: 'Ask about your links' })).toBeVisible();
  return main;
}

test.describe('visual: Ask your shelf chat (#521, mock API)', () => {
  test('a find answer with link cards', async ({ page }) => {
    const scope = await openAsk(page);
    const field = scope.getByRole('textbox', { name: 'Ask about your links' });
    await field.fill('find ramen');
    await field.press('Enter');
    await expect(scope.getByRole('list', { name: 'Links found' })).toBeVisible();
    await expect(scope).toContainText(/I found \d+ links? about ramen\./);
    await expect(field).toHaveAttribute('placeholder', 'Ask a follow-up');

    await expectScreen(page, 'ask-chat-cards');
  });
});
