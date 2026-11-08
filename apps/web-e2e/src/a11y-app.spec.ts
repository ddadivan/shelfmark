import { expect, test } from '@playwright/test';
import { A11Y_SCREENS } from './models/a11y-screens.const';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { settled } from './support/settled';

// One matrix for the whole app: every screen and dialog, both themes, desktop and phone.
test.describe('app-wide accessibility (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });

      for (const { name, open, include, disabledRules, only } of A11Y_SCREENS) {
        test(`${name}: no serious or critical axe violations`, async ({ page }, testInfo) => {
          test.skip(!!only && testInfo.project.name !== only, `${only} project only`);

          await open(page);
          await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
          await settled(page);

          await expectNoBlockingViolations(page, testInfo, { include, disabledRules });
        });
      }
    });
  }
});
