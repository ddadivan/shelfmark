import { expect, test, type Page } from '@playwright/test';
import { A11Y_PAGES } from './models/a11y-pages.const';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { isStaticBuild } from './support/build-mode';
import { seedSession } from './support/mock-session';

async function waitForFonts(page: Page): Promise<void> {
  // String script: this project has no DOM lib, and the code runs in the browser anyway.
  await page.evaluate('document.fonts.ready.then(() => undefined)');
}

for (const colorScheme of Object.values(COLOR_SCHEME)) {
  test.describe(`accessibility (${colorScheme} theme)`, () => {
    test.use({ colorScheme });

    for (const { path, heading, ciOnly, overlayOpener, signedIn, disabledRules } of A11Y_PAGES) {
      test(`${path} has no serious or critical axe violations`, async ({ page }, testInfo) => {
        test.skip(!!ciOnly && !isStaticBuild(), 'page exists only in the static e2e build');
        test.skip(!!signedIn && !!process.env['BASE_URL'], 'deployed builds have no mock auth API');

        if (signedIn) {
          await seedSession(page);
        }
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
        if (path === '/') {
          // The landing defers its lower sections: scan the whole page, not just the hero.
          await expect(page.getByRole('contentinfo')).toBeVisible();
        }
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
        await waitForFonts(page);

        if (overlayOpener) {
          await page.getByRole('button', { name: overlayOpener }).click();
          await expect(page.getByRole('dialog')).toBeVisible();
        }

        await expectNoBlockingViolations(page, testInfo, { disabledRules });
      });
    }
  });
}
