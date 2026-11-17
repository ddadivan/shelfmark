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

/** Signed in, on Settings › AI (or You › AI on a phone), scrolled to Connect your assistant. */
async function openConnect(page: Page): Promise<Locator> {
  await seedSession(page);
  await page.goto('/links');
  await expect(page.locator('ui-card').first()).toBeVisible();
  await openAiSettings(page);
  const group = page.getByRole('group', { name: 'Connect your assistant' });
  await group.scrollIntoViewIfNeeded();
  await expect(group).toBeVisible();
  return group;
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
    await expect(group.locator('code')).toHaveText(/\/api\/mcp$/);

    const dialog = await createToken(page, group, 'Claude Desktop');
    await expect(dialog.locator('code')).toHaveText(/^smk_live_mock.{0,4}….{4}$/);
    await expectNoBlockingViolations(page, testInfo, { include: '.cdk-dialog-container' });

    await dialog.getByRole('button', { name: 'Copy the token' }).click();
    await expect(page.getByText('Token copied')).toBeVisible();
    const secret = await page.evaluate(() => navigator.clipboard.readText());
    expect(secret).toMatch(MOCK_SECRET);
    // The secret never reaches storage: the mock keeps the summary only.
    const stored = await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    );
    expect(stored).not.toContain(secret);

    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(secret)).toHaveCount(0);

    const item = group.getByRole('listitem').filter({ hasText: 'Claude Desktop' });
    await expect(item).toContainText(`Ends in ${secret.slice(-4)}`);
    await expect(item).toContainText('never used');
    await expect(item).toContainText('Includes notes');
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
    const toggle = group.getByRole('button', { name: /^How to connect/ });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(group.getByRole('heading', { name: 'Claude Code' })).toBeVisible();
    await expect(group.locator('pre').first()).toContainText('claude mcp add --transport http');
    await expect(group.locator('pre').first()).toContainText('/api/mcp');
  });

  test('a Free account sees it is part of Pro and cannot create a token', async ({ page }) => {
    await page.addInitScript(
      ([key]) => localStorage.setItem(key, JSON.stringify({ tier: 'free' })),
      [MOCK_AI_KEY],
    );
    const group = await openConnect(page);
    await expect(group.getByText('Connecting an assistant is part of Pro.')).toBeVisible();
    await expect(group.getByRole('button', { name: 'Create token' })).toBeDisabled();
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

    const item = group.getByRole('listitem').filter({ hasText: 'Phone' });
    await expect(item).toContainText('never used');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
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
