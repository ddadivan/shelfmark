import { expect, test } from '@playwright/test';

// Local `nx serve` is a development build without a service worker; CI and a deployed URL are
// production builds (see playwright.config.mts). The static manifest, index.html and ngsw-config
// checks are Vitest specs: apps/web/src/config-checks/pwa-config.spec.ts (#349).
const isProductionBuild = !!process.env['CI'] || !!process.env['BASE_URL'];

test.describe('service worker', () => {
  test.skip(!isProductionBuild, 'the development build registers no service worker');

  test('registers and takes control after the first load', async ({ page }) => {
    await page.goto('/');

    // String expression: this project has no DOM lib.
    const scope = await page.evaluate<string>(
      'navigator.serviceWorker.ready.then((registration) => registration.scope)',
    );
    expect(scope).toBe(new URL('/', page.url()).toString());
  });
});
