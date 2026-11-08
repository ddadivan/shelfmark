import { expect, test as base } from '@playwright/test';

/**
 * `test` with the monitoring config answered for every spec: no API runs in this suite, and the
 * app asks `/api/monitoring/config` once after start-up. The stub says "no Sentry DSN", so the
 * SDK is never loaded and nothing leaves the page. A spec that registers its own catch-all route
 * must `route.fallback()` (not `continue()`) for requests it does not handle, so this stub applies.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/api/monitoring/config', (route) =>
      route.fulfill({ json: { dsn: null, environment: 'test', release: null } }),
    );
    await use(page);
  },
});

export { expect };
