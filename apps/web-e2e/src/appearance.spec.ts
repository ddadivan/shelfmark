import { type Locator, type Page, type TestInfo } from '@playwright/test';
import { E2E_PROJECT } from './models/e2e-project.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { expect, test } from './support/test';

// Custom theme and the Animations setting (issue #273). In the mock build the account settings
// live in localStorage (`MockUserSettingsApi`), so a reload and a second tab see them like the
// server's.

/** A radio by its accessible name inside the radiogroup named `group`. */
function choice(page: Page, group: string, name: string): Locator {
  return page.getByRole('radiogroup', { name: group }).getByRole('radio', { name, exact: true });
}

async function pick(page: Page, group: string, name: string): Promise<void> {
  // A click event on the radio itself: the visually hidden input can sit under the phone tab bar.
  await choice(page, group, name).dispatchEvent('click');
  await expect(choice(page, group, name)).toBeChecked();
}

const token = (page: Page, name: string): Promise<string> =>
  page.evaluate(
    `getComputedStyle(document.documentElement).getPropertyValue('${name}').trim().toLowerCase()`,
  );

async function openAppearance(page: Page): Promise<void> {
  await page.goto('/settings/appearance');
  await expect(page.getByRole('heading', { level: 1, name: 'Appearance' })).toBeVisible();
}

test.describe('appearance: custom theme and animations (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test('Custom swaps accent, background and corners, and a reload keeps it', async ({ page }) => {
    await openAppearance(page);
    const html = page.locator('html');
    await expect(page.getByText('Start from')).toHaveCount(0);

    await pick(page, 'Theme', 'Custom');
    await expect(html).toHaveAttribute('data-theme', 'custom');
    await expect(html).toHaveAttribute('data-custom-base', 'light');
    // The default custom theme: Ocean on Paper with soft corners.
    expect(await token(page, '--accent')).toBe('#2e6a99');
    expect(await token(page, '--bg')).toBe('#f7f4ee');

    await pick(page, 'Start from', 'Dark');
    await expect(html).toHaveAttribute('data-custom-base', 'dark');
    await expect(html).toHaveCSS('color-scheme', 'dark');
    await pick(page, 'Accent colour', 'Rose');
    await pick(page, 'Background', 'Ink');
    await pick(page, 'Corners', 'Square');

    expect(await token(page, '--accent')).toBe('#e79ab2');
    expect(await token(page, '--bg')).toBe('#12141a');
    expect(await token(page, '--radius-md')).toMatch(/^0?\.1875rem$/);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 20, 26)');

    await page.reload();

    await expect(html).toHaveAttribute('data-theme', 'custom');
    await expect(html).toHaveAttribute('data-custom-accent', 'rose');
    await expect(html).toHaveAttribute('data-custom-background', 'ink');
    await expect(html).toHaveAttribute('data-custom-corners', 'square');
    await expect(choice(page, 'Accent colour', 'Rose')).toBeChecked();

    await page.getByRole('button', { name: 'Reset custom theme' }).click();
    await expect(html).toHaveAttribute('data-custom-base', 'light');
    await expect(html).toHaveAttribute('data-custom-accent', 'ocean');

    // Light stays fixed: the custom attributes go away, the custom theme is kept for later.
    await pick(page, 'Theme', 'Light');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(html).not.toHaveAttribute('data-custom-accent', /.*/);
    expect(await token(page, '--accent')).toBe('#4f7a4b');
  });

  test('another tab follows the change', async ({ page, context }) => {
    await openAppearance(page);
    const other = await context.newPage();
    await other.goto('/links');
    await expect(other.locator('ui-card').first()).toBeVisible();
    // Let the other tab's own account load finish first (it would answer the older values).
    await other.waitForTimeout(500);

    await pick(page, 'Theme', 'Custom');
    await pick(page, 'Accent colour', 'Teal');

    await expect(other.locator('html')).toHaveAttribute('data-theme', 'custom');
    await expect(other.locator('html')).toHaveAttribute('data-custom-accent', 'teal');
    await other.close();
  });

  test('Animations: Reduced removes the card and list morph', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === E2E_PROJECT.Phone, 'the morph is checked on desktop');
    await page.addInitScript(`(() => {
      const start = document.startViewTransition?.bind(document);
      window.__morphs = 0;
      if (start) {
        document.startViewTransition = (cb) => { window.__morphs++; return start(cb); };
      }
    })()`);
    const morphs = (): Promise<number> => page.evaluate<number>('window.__morphs');
    const toggle = async (view: string): Promise<number> => {
      await page.evaluate('window.__morphs = 0');
      await page.getByRole('radio', { name: view, exact: true }).click();
      await expect(page.getByRole('radio', { name: view, exact: true })).toBeChecked();
      return morphs();
    };

    await page.goto('/links');
    await expect(page.locator('ui-card').first()).toBeVisible();
    expect(await toggle('List')).toBeGreaterThan(0);

    await openAppearance(page);
    await pick(page, 'Animations', 'Reduced');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await page.goto('/links');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect(page.locator('ui-list-item').first()).toBeVisible();

    expect(await toggle('Cards')).toBe(0);
    await expect(page.locator('ui-card').first()).toBeVisible();
  });

  test('Animations: Reduced stills the landing even when the device allows motion', async ({
    page,
  }) => {
    await openAppearance(page);
    await pick(page, 'Animations', 'Reduced');
    // As a guest (session gone): the landing reads the remembered setting on the first paint.
    await page.evaluate(`localStorage.removeItem('sm-mock-session')`);
    const guest = await page.context().newPage();
    await guest.goto('/');
    expect(await guest.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")).toBe(
      false,
    );
    await expect(guest.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect(guest.getByTestId('landing-chat-messages').getByRole('listitem')).toHaveCount(5);
    await expect(guest.getByTestId('landing-chat-track')).toHaveCount(0);
    await guest.close();
  });
});

/**
 * axe after the animations, scrolled to the end: there the shell keeps room for the phone tab
 * bar, so its glass is not composited over a bright swatch (axe would measure the label on that).
 */
async function scanSettled(page: Page, testInfo: TestInfo): Promise<void> {
  await page.evaluate('scrollTo(0, document.documentElement.scrollHeight)');
  await settled(page);
  await expectNoBlockingViolations(page, testInfo);
}

test.describe('appearance accessibility (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  for (const theme of ['Light', 'Dark']) {
    test(`Appearance in ${theme}: no serious or critical axe violations`, async ({
      page,
    }, testInfo) => {
      await openAppearance(page);
      await pick(page, 'Theme', theme);
      await scanSettled(page, testInfo);
    });
  }

  test('Appearance in a dark Custom theme: no serious or critical axe violations', async ({
    page,
  }, testInfo) => {
    await openAppearance(page);
    await pick(page, 'Theme', 'Custom');
    await pick(page, 'Start from', 'Dark');
    await pick(page, 'Accent colour', 'Amber');
    await pick(page, 'Background', 'Black');
    await expect(page.locator('html')).toHaveAttribute('data-custom-background', 'black');
    await scanSettled(page, testInfo);
  });
});
