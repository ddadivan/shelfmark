import type { Locator, Page } from '@playwright/test';
import { E2E_TAG } from './models/e2e-tag.const';
import { openAiSettings } from './support/ai';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';
import { isPhone } from './support/sidebar';
import { expect, test } from './support/test';

// Same values as MOCK_MCP_STORAGE_KEY and MOCK_AI_STORAGE_KEY (apps/web/src/app/features/ai).
const MOCK_MCP_KEY = 'sm-mock-mcp-tokens';
const MOCK_AI_KEY = 'sm-mock-ai';
/** `MCP_TOKEN_PREFIX`, then the mock marker and 39 more base64url characters. */
const MOCK_SECRET = /^smk_live_mock[A-Za-z0-9_-]{39}$/;

/**
 * Signed in, on the "Connect your assistant" page (`/settings/ai/connect`, Shelf 15-tools),
 * reached from its row in Settings › AI (You › AI in the mobile shell). Resolves with the page.
 */
async function openConnect(page: Page): Promise<Locator> {
  await seedSession(page);
  await page.goto('/links');
  await expect(page.locator('ui-card').first()).toBeVisible();
  await openAiSettings(page);
  await page
    .getByRole('group', { name: 'Connect your assistant' })
    .getByRole('link', { name: 'Open' })
    .click();
  await expect(page).toHaveURL('/settings/ai/connect');
  const main = page.getByRole('main');
  await expect(
    main.getByRole('heading', { level: 1, name: 'Connect your assistant' }),
  ).toBeVisible();
  return main;
}

/** Creates a token named `name` from the group and returns the dialog on its shown-once view. */
async function createToken(page: Page, group: Locator, name: string): Promise<Locator> {
  await group.getByRole('button', { name: 'Create token' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a token' });
  await expect(dialog.getByRole('switch', { name: 'Include my notes' })).not.toBeChecked();
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByRole('switch', { name: 'Include my notes' }).click();
  await dialog.getByRole('button', { name: 'Create token' }).click();
  const shown = page.getByRole('dialog', { name: `Token for ${name}` });
  await expect(shown.getByText('you won’t see it again')).toBeVisible();
  return shown;
}

test.describe('Connect your assistant (#395, mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('creates a token shown once, copies it, lists it and revokes it', async ({
    page,
  }, testInfo) => {
    const group = await openConnect(page);
    await expect(group.getByText('No assistants connected')).toBeVisible();
    await expect(
      group.getByRole('group', { name: 'How to connect' }).locator('code').first(),
    ).toHaveText(/\/api\/mcp$/);

    const dialog = await createToken(page, group, 'Claude Desktop');
    await expect(dialog.locator('code')).toHaveText(/^smk_live_mock.{0,4}….{4}$/);
    await expectNoBlockingViolations(page, testInfo, { include: '.cdk-dialog-container' });

    await dialog.getByRole('button', { name: 'Copy the token' }).click();
    await expect(page.getByText('Token copied')).toBeVisible();
    const secret = await page.evaluate<string>('navigator.clipboard.readText()');
    expect(secret).toMatch(MOCK_SECRET);
    // The secret never reaches storage: the mock keeps the summary only.
    const stored = await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    );
    expect(stored).not.toContain(secret);

    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(secret)).toHaveCount(0);

    // A Tokens row (Shelf 15-tools): the name, "Created … · never used · expires … · includes
    // notes" and the access badge.
    const item = group.locator('ui-settings-row').filter({ hasText: 'Claude Desktop' });
    await expect(item).toContainText('never used');
    await expect(item).toContainText(/expires \w{3} \d+, \d{4}/);
    await expect(item).toContainText('includes notes');
    await expect(item).toContainText('Read only');
    await expectNoBlockingViolations(page, testInfo);

    await item.getByRole('button', { name: 'Revoke Claude Desktop' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Revoke Claude Desktop?' });
    await confirm.getByRole('button', { name: 'Revoke' }).click();
    await expect(confirm).toBeHidden();
    await expect(group.getByText('No assistants connected')).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), MOCK_MCP_KEY)).toBe('[]');
  });

  test('shows the setup per client with the server address', async ({ page }) => {
    const group = await openConnect(page);
    // One assistant at a time (Shelf 15-tools): Claude Desktop first, the others by their chip.
    const howTo = group.getByRole('group', { name: 'How to connect' });
    await expect(howTo.getByRole('region', { name: 'Claude Desktop' })).toBeVisible();
    await howTo.getByRole('radio', { name: 'Claude Code' }).dispatchEvent('click');
    const setup = howTo.getByRole('region', { name: 'Claude Code' });
    await expect(setup.getByRole('heading', { name: 'Claude Code' })).toBeVisible();
    await expect(setup.locator('pre').first()).toContainText('claude mcp add --transport http');
    await expect(setup.locator('pre').first()).toContainText('/api/mcp');
  });

  test('a Free account sees it is part of Pro and cannot create a token', async ({ page }) => {
    await page.addInitScript(
      ([key]) => localStorage.setItem(key, JSON.stringify({ tier: 'free' })),
      [MOCK_AI_KEY],
    );
    const group = await openConnect(page);
    // The Pro card takes the place of Create token and the how-to.
    await expect(
      group.getByRole('heading', { name: 'Connecting an assistant is part of Pro' }),
    ).toBeVisible();
    await expect(group.getByRole('button', { name: 'Create token' })).toHaveCount(0);
    await expect(group.getByRole('group', { name: 'How to connect' })).toHaveCount(0);
  });
});

test.describe('Connect your assistant on touch (#395, mock API)', { tag: E2E_TAG.Mobile }, () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('You › AI creates a token in a sheet and revokes it, without sideways scroll', async ({
    page,
  }) => {
    const group = await openConnect(page);
    const dialog = await createToken(page, group, 'Phone');
    if (isPhone(page)) {
      // A phone shows the dialog as a bottom sheet with a grip.
      await expect(page.locator('.ui-dialog__grip')).toBeVisible();
    }
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toBeHidden();

    const item = group.locator('ui-settings-row').filter({ hasText: 'Phone' });
    await expect(item).toContainText('never used');
    const overflow = await page.evaluate<number>(
      'document.documentElement.scrollWidth - document.documentElement.clientWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await item.getByRole('button', { name: 'Revoke Phone' }).click();
    await page
      .getByRole('alertdialog', { name: 'Revoke Phone?' })
      .getByRole('button', { name: 'Revoke' })
      .click();
    await expect(group.getByText('No assistants connected')).toBeVisible();
  });
});
