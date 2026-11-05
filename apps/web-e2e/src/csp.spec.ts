import { expect, test, type Page } from '@playwright/test';
import { readCsp, readVercelConfig } from './support/vercel-config';

const csp = readCsp(readVercelConfig());
const deployedUrl = process.env['BASE_URL'];
const isProductionBuild = !!process.env['CI'];
const deepLink = '/folders/does-not-matter';

async function collectViolations(page: Page): Promise<void> {
  // String script: this project has no DOM lib, and the code runs in the browser anyway.
  await page.addInitScript(`
    globalThis.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      globalThis.__cspViolations.push(event.violatedDirective + ' ' + event.blockedURI);
    });
  `);
}

function readViolations(page: Page): Promise<string[]> {
  return page.evaluate<string[]>(`globalThis.__cspViolations ?? []`);
}

test.describe('Content-Security-Policy', () => {
  test.skip(
    !deployedUrl && !isProductionBuild,
    'CSP is only enforced against the production build (CI) or a deployed BASE_URL, not the dev server',
  );

  test.describe('production build with the vercel.json policy applied', () => {
    test.skip(!!deployedUrl || !isProductionBuild, 'static-server mode only');

    test.beforeEach(async ({ page }) => {
      await page.route('**/*', async (route) => {
        const request = route.request();
        if (request.resourceType() !== 'document') {
          await route.continue();
          return;
        }
        const response = await route.fetch();
        await route.fulfill({
          response,
          headers: { ...response.headers(), 'content-security-policy': csp },
        });
      });
    });

    for (const [name, path] of [
      ['the landing page', '/'],
      ['a deep link', deepLink],
    ]) {
      test(`loads ${name} without CSP violations`, async ({ page }) => {
        const consoleErrors: string[] = [];
        page.on('console', (message) => {
          if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) {
            consoleErrors.push(message.text());
          }
        });
        await collectViolations(page);

        await page.goto(path);
        // No route matches the deep link yet, so assert the SPA shell for both pages.
        await expect(page.locator('app-root')).toBeAttached();
        await page.waitForLoadState('load');
        await page.evaluate('new Promise((resolve) => setTimeout(resolve, 500))');

        expect(await readViolations(page)).toEqual([]);
        expect(consoleErrors).toEqual([]);
      });
    }

    test('renders the landing page under the policy', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: 'Shelfmark' })).toBeVisible();
    });

    test('blocks an injected inline style (proves the policy is enforced)', async ({ page }) => {
      await collectViolations(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: 'Shelfmark' })).toBeVisible();

      await page.evaluate(`
        const style = document.createElement('style');
        style.textContent = 'body { background: red }';
        document.head.append(style);
      `);

      await expect
        .poll(() => readViolations(page))
        .toContainEqual(expect.stringContaining('style-src'));
    });
  });

  test.describe('deployed URL', () => {
    test.skip(!deployedUrl, 'requires BASE_URL');

    test('serves the exact CSP from vercel.json', async ({ request }) => {
      const response = await request.get('/');
      expect(response.status()).toBe(200);
      expect(response.headers()['content-security-policy']).toBe(csp);
    });

    test('falls back to the app for a deep link', async ({ page }) => {
      const response = await page.goto(deepLink);
      expect(response?.status()).toBe(200);
      // No route matches a deep link yet, so assert the SPA shell instead of a heading.
      await expect(page.locator('app-root')).toBeAttached();
    });

    test('returns a real 404 for a missing file, not the app shell', async ({ request }) => {
      for (const path of ['/missing.js', '/nonexistent.woff2']) {
        const response = await request.get(path);
        expect(response.status(), path).toBe(404);
        expect(await response.text(), path).not.toContain('app-root');
      }
    });

    test('hands the API the original path and query, without extra params', async ({ request }) => {
      const response = await request.get('/api/nope?x=1');
      expect(response.status()).toBe(404);
      const body = (await response.json()) as { message: string };
      expect(body.message).toContain('/api/nope?x=1');
      expect(body.message).not.toContain('path=');
    });
  });
});
