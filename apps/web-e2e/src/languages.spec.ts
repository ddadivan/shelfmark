import { type Page, type TestInfo } from '@playwright/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { isPhone } from './support/sidebar';
import { expect, test } from './support/test';

// Interface languages (issue #274). In the mock build the account settings live in localStorage
// (`MockUserSettingsApi`, `sm-mock-language`), so a reload sees them like it would see the
// server's; `sm-language` is the browser's copy for the first paint.

const LANGUAGE_KEY = 'sm-language';
const MOCK_LANGUAGE_KEY = 'sm-mock-language';

/** Starts with this language saved on the (mock) account and in the browser. */
async function seedLanguage(page: Page, language: string): Promise<void> {
  const settings = JSON.stringify({
    language,
    dateFormat: 'default',
    timeFormat: 'default',
    weekStart: 'default',
    spellcheck: true,
  });
  await page.addInitScript(
    ([keys, value]) => {
      for (const key of keys) {
        localStorage.setItem(key, value);
      }
    },
    [[LANGUAGE_KEY, MOCK_LANGUAGE_KEY], settings] as const,
  );
}

async function chooseOption(page: Page, field: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: field }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

const preview = (page: Page) => page.getByTestId('language-preview');

/** The page has no horizontal scroll (phone from 360px). */
async function expectNoSideScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate<number>(
    'document.documentElement.scrollWidth - document.documentElement.clientWidth',
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Buttons and tab labels never cut their text (Languages mockup layout rules). */
async function expectNoClippedButtons(page: Page): Promise<void> {
  const clipped = await page.evaluate<string[]>(`
    Array.from(document.querySelectorAll('.ui-button, .ui-tab-bar__label'))
      .filter((b) => b.offsetParent !== null && b.scrollWidth > b.clientWidth + 1)
      .map((b) => b.textContent.trim())
  `);
  expect(clipped).toEqual([]);
}

test.describe('interface languages (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('switching to French changes the UI and the dates at once, and a reload keeps it', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto('/settings/language');
    await expect(page.getByRole('heading', { level: 1, name: 'Language' })).toBeVisible();
    await expect(preview(page)).toContainText(/\d/);
    const english = (await preview(page).textContent()) ?? '';
    await page.evaluate('window.__noReload = true');

    await chooseOption(page, 'Interface language', 'Français');

    await expect(page.getByRole('heading', { level: 1, name: 'Langue' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('combobox', { name: 'Langue de l’interface' })).toContainText(
      'Français',
    );
    await expect(preview(page)).not.toHaveText(english);
    await expect(preview(page)).toContainText(
      /(janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)/,
    );
    expect(await page.evaluate('window.__noReload === true')).toBe(true);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Langue' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    await page.goto('/links');
    await expect(page.getByRole('heading', { level: 1, name: 'Tous les liens' })).toBeVisible();
  });

  test('date format, clock and week start apply to the preview and the dates of the app', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto('/settings/language');
    await expect(preview(page)).toContainText(/\d/);

    await chooseOption(page, 'Date format', await isoSample(page));
    await expect(preview(page)).toContainText(/\d{4}-\d{2}-\d{2}/);

    await page
      .getByRole('radiogroup', { name: 'Time' })
      .getByRole('radio', { name: '24-hour', exact: true })
      .dispatchEvent('click');
    await expect(preview(page)).not.toContainText(/AM|PM/);

    await page
      .getByRole('radiogroup', { name: 'Week starts on' })
      .getByRole('radio', { name: 'Sunday', exact: true })
      .dispatchEvent('click');
    await expect(
      page.getByRole('radiogroup', { name: 'Week starts on' }).getByRole('radio', {
        name: 'Sunday',
      }),
    ).toBeChecked();

    // The dates of "What's new" on /about follow the chosen format.
    await page.goto('/about');
    const dates = page.locator('app-landing-whats-new time');
    await expect(dates.first()).toHaveText(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('spell-check notes follows the setting in the add-link dialog', async ({ page }) => {
    await seedSession(page);
    await page.goto('/settings/language');
    await page.getByRole('switch', { name: 'Spell-check notes' }).click();
    await expect(page.getByRole('switch', { name: 'Spell-check notes' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await page.goto('/links');
    await page.getByRole('button', { name: 'Add link' }).first().click();
    await expect(page.getByRole('dialog').getByLabel('Note')).toHaveAttribute(
      'spellcheck',
      'false',
    );
  });

  test.describe('with a German browser', () => {
    test.use({ locale: 'de-DE' });

    test('"Match my browser" shows German on the first paint', async ({ page }) => {
      await seedSession(page);
      await page.goto('/links');
      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
      await expect(page.getByRole('heading', { level: 1, name: 'Alle Links' })).toBeVisible();

      await page.goto('/settings/language');
      await expect(page.getByRole('combobox', { name: 'Sprache der Oberfläche' })).toContainText(
        'Wie mein Browser',
      );
    });

    test('a guest sees the landing in German and can switch it in the footer', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('Link einfügen.')).toBeVisible();
      await page
        .getByRole('group', { name: 'Sprache' })
        .getByRole('button', { name: 'Español' })
        .click();
      await expect(page.getByText('Pega un enlace.')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
      await page.reload();
      await expect(page.getByText('Pega un enlace.')).toBeVisible();
    });
  });

  for (const language of ['fr', 'de']) {
    test(`long ${language} strings fit: no side scroll, no clipped buttons`, async ({
      page,
    }, testInfo: TestInfo) => {
      await seedLanguage(page, language);
      await seedSession(page);
      for (const path of ['/links', '/settings/language', '/trash', '/settings/library']) {
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('lang', language);
        await settled(page);
        await expectNoSideScroll(page);
        await expectNoClippedButtons(page);
        await testInfo.attach(`${language}${path.replace(/\//g, '-')}`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        });
      }
    });
  }
});

/** The ISO sample of the date format list (today, yyyy-mm-dd). */
async function isoSample(page: Page): Promise<string> {
  return page.evaluate<string>(
    '(() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })()',
  );
}

test.describe('interface languages: axe', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  for (const language of ['fr', 'de']) {
    for (const colorScheme of Object.values(COLOR_SCHEME)) {
      test.describe(`${language}, ${colorScheme}`, () => {
        test.use({ colorScheme });

        test.beforeEach(async ({ page }) => {
          await seedLanguage(page, language);
          await seedSession(page);
        });

        test('library', async ({ page }, testInfo) => {
          await page.goto('/links');
          await expect(page.locator('ui-card').first()).toBeVisible();
          await expect(page.locator('html')).toHaveAttribute('lang', language);
          await settled(page);
          await expectNoBlockingViolations(page, testInfo);
        });

        test('add link dialog', async ({ page }, testInfo) => {
          await page.goto('/links');
          await expect(page.locator('ui-card').first()).toBeVisible();
          const add = language === 'fr' ? 'Ajouter un lien' : 'Link hinzufügen';
          await page.getByRole('button', { name: add }).first().click();
          await expect(page.getByRole('dialog')).toBeVisible();
          await settled(page);
          await expectNoBlockingViolations(page, testInfo, { include: '[role="dialog"]' });
        });

        test('settings › language', async ({ page }, testInfo) => {
          await page.goto('/settings/language');
          await expect(page.getByTestId('language-preview')).toContainText(/\d/);
          await settled(page);
          await expectNoBlockingViolations(page, testInfo);
          if (isPhone(page)) {
            await expectNoSideScroll(page);
          }
        });
      });
    }
  }
});
