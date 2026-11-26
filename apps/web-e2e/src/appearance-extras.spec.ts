import { type Locator, type Page } from '@playwright/test';
import { seedSession } from './support/mock-session';
import { isCompact } from './support/sidebar';
import { expect, test } from './support/test';
import { E2E_TAG } from './models/e2e-tag.const';

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

async function openAppearance(page: Page): Promise<void> {
  await page.goto('/settings/appearance');
  await expect(page.getByRole('heading', { level: 1, name: 'Appearance' })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Density' })).toBeVisible();
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

  test('the View menu sets the preview image size and Show site, kept on the account', async ({
    page,
  }) => {
    await openAppearance(page);
    await expect(page.getByText('Cards', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Live preview')).toHaveCount(0);

    await openFeed(page);
    const viewMenu = async (): Promise<void> => {
      const button = page.getByRole('button', { name: 'View', exact: true });
      if ((await button.getAttribute('aria-expanded')) !== 'true') {
        await button.click();
      }
    };
    await viewMenu();
    const sizes = page.getByRole('radiogroup', { name: 'Preview image' });
    await sizes.getByRole('radio', { name: 'Off', exact: true }).dispatchEvent('click');
    await page.getByRole('switch', { name: 'Show site', exact: true }).click();
    await expect(page.getByRole('switch', { name: 'Show site', exact: true })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await page.keyboard.press('Escape');

    await page.reload();
    const card = page.locator('ui-card').first();
    await expect(card).toBeVisible();
    await expect(card.locator('.ui-card__media')).toBeHidden();
    await expect(card.locator('.link-card__site')).toBeHidden();
    // The title, the favorite and the menu stay.
    await expect(card.getByRole('heading')).toBeVisible();

    await viewMenu();
    await expect(
      page
        .getByRole('radiogroup', { name: 'Preview image' })
        .getByRole('radio', { name: 'Off', exact: true }),
    ).toBeChecked();
    await page
      .getByRole('radiogroup', { name: 'Preview image' })
      .getByRole('radio', { name: 'Small', exact: true })
      .dispatchEvent('click');
    await page.keyboard.press('Escape');
    const ratio = await page
      .locator('ui-card .ui-card__media')
      .first()
      .evaluate((media) => media.clientWidth / media.clientHeight);
    expect(ratio).toBeGreaterThan(3);
  });

  test(
    'the phone keeps every option reachable at 125% text without side scroll',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      test.skip(!isCompact(page), 'phone layout');
      await openAppearance(page);
      await pick(page, 'Text size', '125%');
      await pick(page, 'Density', 'Compact');
      await expectNoSideScroll(page);
      for (const group of ['Text size', 'Font', 'Density', 'Animations']) {
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
    },
  );
});
