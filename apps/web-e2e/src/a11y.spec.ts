import { expect, test } from './support/test';
import { A11Y_PAGES } from './models/a11y-pages.const';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { isStaticBuild } from './support/build-mode';
import { settled } from './support/settled';

// Public pages, also against a deployed URL. The signed-in app screens are in `a11y-app.spec.ts`.
for (const colorScheme of Object.values(COLOR_SCHEME)) {
  test.describe(`accessibility (${colorScheme} theme)`, () => {
    test.use({ colorScheme });

    for (const { path, heading, ciOnly, overlayOpener } of A11Y_PAGES) {
      test(`${path} has no serious or critical axe violations`, async ({ page }, testInfo) => {
        test.skip(!!ciOnly && !isStaticBuild(), 'page exists only in the static e2e build');

        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
        if (path === '/') {
          // The landing defers its lower sections: scan the whole page, not just the hero.
          await expect(page.getByRole('contentinfo')).toBeVisible();
        }
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
        await settled(page);

        if (overlayOpener) {
          await page.getByRole('button', { name: overlayOpener }).click();
          await expect(page.getByRole('dialog')).toBeVisible();
        }

        await expectNoBlockingViolations(page, testInfo);
      });
    }
  });
}
