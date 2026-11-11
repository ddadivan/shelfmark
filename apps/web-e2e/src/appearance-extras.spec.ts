import { type Locator, type Page, type TestInfo } from '@playwright/test';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { isPhone } from './support/sidebar';
import { expect, test } from './support/test';

// Settings › Appearance extras (issue #285): text size, font, density, card and sidebar options.
// In the mock build the account settings live in localStorage (`MockUserSettingsApi`), so a
// reload sees them like it would see the server's.

function choice(page: Page, group: string, name: string): Locator {
  return page.getByRole('radiogroup', { name: group }).getByRole('radio', { name, exact: true });
}

async function pick(page: Page, group: string, name: string): Promise<void> {
  // A click event on the radio itself: the visually hidden input can sit under the phone tab bar.
  await choice(page, group, name).dispatchEvent('click');
  await expect(choice(page, group, name)).toBeChecked();
}

function toggle(page: Page, name: string): Locator {
  return page.getByRole('switch', { name, exact: true });
}

async function openAppearance(page: Page): Promise<void> {
  await page.goto('/settings/appearance');
  await expect(page.getByRole('heading', { level: 1, name: 'Appearance' })).toBeVisible();
  await expect(toggle(page, 'Show site')).toBeVisible();
}

async function openFeed(page: Page): Promise<void> {
  await page.goto('/links');
  await expect(page.locator('ui-card').first()).toBeVisible();
}

const rootFontSize = (page: Page): Promise<string> =>
  page.evaluate('getComputedStyle(document.documentElement).fontSize');

/** The page has no horizontal scroll (phone from 360px, also at 125% text). */
async function expectNoSideScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate<number>(
    'document.documentElement.scrollWidth - document.documentElement.clientWidth',
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('appearance extras (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test('Text size scales the whole interface and survives a reload', async ({ page }) => {
    await openAppearance(page);
    expect(await rootFontSize(page)).toBe('16px');

    await pick(page, 'Text size', '125%');
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'xl');
    expect(await rootFontSize(page)).toBe('20px');
    await expectNoSideScroll(page);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'xl');
    await expect(choice(page, 'Text size', '125%')).toBeChecked();

    await openFeed(page);
    expect(await rootFontSize(page)).toBe('20px');
    await expectNoSideScroll(page);

    await openAppearance(page);
    await pick(page, 'Text size', '90%');
    expect(await rootFontSize(page)).toBe('14.4px');
    await pick(page, 'Text size', '100%');
    await expect(page.locator('html')).not.toHaveAttribute('data-text-size', /.*/);
  });

  test('Font: Readable sets Atkinson Hyperlegible from our own origin', async ({ page }) => {
    const fonts: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'font') {
        fonts.push(request.url());
      }
    });
    await openAppearance(page);
    await pick(page, 'Font', 'Readable');
    await expect(page.locator('html')).toHaveAttribute('data-font', 'readable');
    await expect
      .poll(() => page.evaluate<string>('getComputedStyle(document.body).fontFamily'))
      .toContain('Atkinson Hyperlegible');
    await expect
      .poll(() => page.evaluate<boolean>('document.fonts.check(\'16px "Atkinson Hyperlegible"\')'))
      .toBe(true);
    const origin = new URL(page.url()).origin;
    expect(fonts.filter((url) => url.includes('atkinson')).length).toBeGreaterThan(0);
    expect(fonts.every((url) => url.startsWith(origin))).toBe(true);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-font', 'readable');
    await pick(page, 'Font', 'System');
    await expect
      .poll(() => page.evaluate<string>('getComputedStyle(document.body).fontFamily'))
      .toContain('system-ui');
  });

  test('Density: Compact tightens the feed and survives a reload', async ({ page }) => {
    await openFeed(page);
    const gap = (): Promise<string> =>
      page.evaluate<string>("getComputedStyle(document.querySelector('.library__grid')).rowGap");
    expect(await gap()).toBe('16px');

    await openAppearance(page);
    await pick(page, 'Density', 'Compact');
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
    await page.reload();
    await expect(choice(page, 'Density', 'Compact')).toBeChecked();

    await openFeed(page);
    expect(await gap()).toBe('8px');
  });

  test('Cards: preview image, site, notes and tags follow the switches and the preview shows it', async ({
    page,
  }) => {
    await openAppearance(page);
    const preview = page.locator('ui-theme-preview');
    await expect(preview.locator('.ui-theme-preview__media').first()).toBeVisible();

    await pick(page, 'Preview image', 'Off');
    await expect(preview.locator('.ui-theme-preview__media').first()).toBeHidden();
    await toggle(page, 'Show site').click();
    await toggle(page, 'Show tags').click();
    await toggle(page, 'Show notes').click();
    await expect(toggle(page, 'Show notes')).toHaveAttribute('aria-checked', 'false');
    await expect(preview.locator('.ui-theme-preview__site').first()).toBeHidden();
    await expect(preview.locator('.ui-theme-preview__tag').first()).toBeHidden();

    await page.reload();
    await expect(toggle(page, 'Show site')).toHaveAttribute('aria-checked', 'false');
    await openFeed(page);
    const card = page.locator('ui-card').first();
    await expect(card.locator('.ui-card__media')).toBeHidden();
    await expect(card.locator('.link-card__site')).toBeHidden();
    await expect(page.locator('.link-card__tags').first()).toBeHidden();
    // The title, the favorite and the menu stay.
    await expect(card.getByRole('heading')).toBeVisible();

    await openAppearance(page);
    await pick(page, 'Preview image', 'Small');
    await openFeed(page);
    const ratio = await page
      .locator('ui-card .ui-card__media')
      .first()
      .evaluate((media) => media.clientWidth / media.clientHeight);
    expect(ratio).toBeGreaterThan(3);
  });

  test('Sidebar and motion: link counts and Remember recently opened', async ({ page }) => {
    await openAppearance(page);
    // The preview draws its sidebar from the tablet width on.
    const sidebar = isPhone(page) ? null : page.locator('ui-theme-preview');
    if (sidebar) {
      await expect(sidebar.locator('.ui-theme-preview__count').first()).toBeVisible();
      await expect(sidebar.getByText('Recently opened')).toBeVisible();
    }

    await toggle(page, 'Link counts').click();
    await expect(toggle(page, 'Link counts')).toHaveAttribute('aria-checked', 'false');
    if (sidebar) {
      await expect(sidebar.locator('.ui-theme-preview__count')).toHaveCount(0);
    }

    // Off asks first; Cancel keeps it on.
    await toggle(page, 'Remember recently opened').click();
    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(dialog).toContainText('Stop remembering recently opened?');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(toggle(page, 'Remember recently opened')).toHaveAttribute('aria-checked', 'true');

    await toggle(page, 'Remember recently opened').click();
    await page.getByRole('button', { name: 'Clear and stop' }).click();
    await expect(toggle(page, 'Remember recently opened')).toHaveAttribute('aria-checked', 'false');
    if (sidebar) {
      await expect(sidebar.getByText('Recently opened')).toHaveCount(0);
    }

    await page.reload();
    await expect(toggle(page, 'Link counts')).toHaveAttribute('aria-checked', 'false');
    // The mock keeps "pause history" in memory, like its history (the API stores it: #269).
    if (!isPhone(page)) {
      await openFeed(page);
      await expect(page.locator('.ui-tree__count')).toHaveCount(0);
    }
  });

  test('the phone keeps every option reachable at 125% text without side scroll', async ({
    page,
  }) => {
    test.skip(!isPhone(page), 'phone layout');
    await openAppearance(page);
    await pick(page, 'Text size', '125%');
    await pick(page, 'Density', 'Compact');
    await expectNoSideScroll(page);
    for (const group of ['Text size', 'Font', 'Density', 'Preview image', 'Animations']) {
      const radiogroup = page.getByRole('radiogroup', { name: group });
      await radiogroup.scrollIntoViewIfNeeded();
      const box = await radiogroup.boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
        page.viewportSize()?.width ?? 0,
      );
    }
    await page.goto('/settings/library');
    await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
    await expectNoSideScroll(page);
  });
});

/** axe after the animations, scrolled to the end (see appearance.spec.ts). */
async function scanSettled(page: Page, testInfo: TestInfo): Promise<void> {
  await page.evaluate('scrollTo(0, document.documentElement.scrollHeight)');
  await settled(page);
  await expectNoBlockingViolations(page, testInfo);
}

test.describe('appearance extras accessibility (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  for (const theme of ['Light', 'Dark']) {
    test(`${theme} at 125% text, compact and readable: no serious or critical axe violations`, async ({
      page,
    }, testInfo) => {
      await openAppearance(page);
      await pick(page, 'Theme', theme);
      await pick(page, 'Text size', '125%');
      await pick(page, 'Density', 'Compact');
      await pick(page, 'Font', 'Readable');
      await scanSettled(page, testInfo);

      await openFeed(page);
      await scanSettled(page, testInfo);
    });
  }
});
