import { expect, test } from './support/test';
import { A11Y_SCREENS } from './models/a11y-screens.const';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { settled } from './support/settled';

// The key app screens (A11Y_SCREENS), both themes, on desktop; the screens tagged for the touch
// projects (ADR 0043) also run on the phone (and the tablet for `@mobile`). The other dialogs,
// menus and states have jsdom axe tests in their component specs (#349).
test.describe('app-wide accessibility (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  for (const colorScheme of Object.values(COLOR_SCHEME)) {
    test.describe(`${colorScheme} theme`, () => {
      test.use({ colorScheme });

      for (const { name, open, include, disabledRules, only, tag } of A11Y_SCREENS) {
        test(
          `${name}: no serious or critical axe violations`,
          { tag: tag ? [tag] : [] },
          async ({ page }, testInfo) => {
            test.skip(!!only && testInfo.project.name !== only, `${only} project only`);

            await open(page);
            await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
            await settled(page);

            await expectNoBlockingViolations(page, testInfo, { include, disabledRules });
          },
        );
      }
    });
  }
});
