import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { buildCsp, createCspMiddleware } from '@shelfmark/web-csp';
import { LANDING_HEADLINE } from './models/landing-headline.const';
import { isCiBuild } from './support/build-mode';
import { readCsp, readVercelConfig } from './support/vercel-config';

const staticCsp = readCsp(readVercelConfig());
const deployedUrl = process.env['BASE_URL'];
const isProductionBuild = isCiBuild();
const deepLink = '/folders/does-not-matter';
const testPage = '/__e2e/csp';
const noncePattern = /^[A-Za-z0-9+/]{22}==$/;

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

/** Pulls the nonce out of the CSP header, or '' when `style-src` has none. */
function nonceFromCsp(csp: string | undefined): string {
  return /style-src 'self' 'nonce-([^']+)'/.exec(csp ?? '')?.[1] ?? '';
}

/** Runs the real middleware handler (not a copy of its logic) on every document response. */
async function applyMiddleware(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (request.resourceType() !== 'document') {
      // Not ours: let earlier handlers (the monitoring config stub) answer.
      await route.fallback();
      return;
    }
    const upstream = await route.fetch();
    const handled = createCspMiddleware(await upstream.text())(
      new Request(request.url(), { method: request.method() }),
    );
    if (!handled) {
      await route.fulfill({ response: upstream });
      return;
    }
    await route.fulfill({
      status: handled.status,
      headers: Object.fromEntries(handled.headers),
      body: await handled.text(),
    });
  });
}

async function expectNoCspProblems(page: Page, path: string): Promise<void> {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  await collectViolations(page);

  await page.goto(path);
  await expect(page.locator('app-root')).toBeAttached();
  await page.waitForLoadState('load');
  await page.evaluate('new Promise((resolve) => setTimeout(resolve, 500))');

  expect(await readViolations(page)).toEqual([]);
  expect(consoleErrors).toEqual([]);
}

test.describe('Content-Security-Policy', () => {
  test.skip(
    !deployedUrl && !isProductionBuild,
    'CSP is only enforced against the e2e build (CI) or a deployed BASE_URL, not the dev server',
  );

  test.describe('e2e build with the real nonce middleware applied', () => {
    test.skip(!!deployedUrl || !isProductionBuild, 'static-server mode only');

    test.beforeEach(async ({ page }) => {
      await applyMiddleware(page);
    });

    for (const [name, path] of [
      ['the landing page', '/'],
      ['a deep link', deepLink],
      ['the test page with ui-button, ui-icon and a CDK overlay', testPage],
    ]) {
      test(`loads ${name} without CSP violations`, async ({ page }) => {
        await expectNoCspProblems(page, path);
      });
    }

    test('renders the landing page under the policy', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();
    });

    test('applies component styles of ui-button, ui-icon and a CDK overlay', async ({ page }) => {
      await collectViolations(page);
      await page.goto(testPage);

      const button = page.getByRole('button', { name: 'Open overlay' });
      await expect(button).toBeVisible();
      // A coarse pointer (the phone project has touch) raises every ui-button to the 2.75rem touch target.
      const coarse = test.info().project.use.hasTouch === true;
      await expect(button).toHaveCSS('height', coarse ? '44px' : '36px');
      await expect(page.getByRole('img', { name: 'Star' })).toBeVisible();

      await button.click();
      const panel = page.getByRole('dialog', { name: 'CSP test overlay' });
      await expect(panel).toBeVisible();
      await expect(panel).toHaveCSS('border-top-left-radius', '10px');

      expect(await readViolations(page)).toEqual([]);
    });

    test('puts the nonce on every style element Angular adds', async ({ page }) => {
      await page.goto(testPage);
      await page.getByRole('button', { name: 'Open overlay' }).click();
      await expect(page.getByRole('dialog', { name: 'CSP test overlay' })).toBeVisible();

      const expected = await page.locator('app-root').getAttribute('ngcspnonce');
      expect(expected).toMatch(noncePattern);
      // `element.nonce` exposes the value that `getAttribute('nonce')` hides from the DOM.
      const nonces = await page.evaluate<string[]>(
        `Array.from(document.querySelectorAll('style')).map((style) => style.nonce)`,
      );
      expect(nonces.length).toBeGreaterThan(0);
      expect(nonces.every((nonce) => nonce === expected)).toBe(true);
    });

    test('blocks an injected inline style without the nonce', async ({ page }) => {
      await collectViolations(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();

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

    test('serves a CSP whose nonce equals the one in the document', async ({ request }) => {
      const response = await request.get('/');
      expect(response.status()).toBe(200);
      const csp = response.headers()['content-security-policy'];
      const nonce = nonceFromCsp(csp);
      expect(nonce).toMatch(noncePattern);
      expect(csp).toBe(buildCsp(nonce));
      expect(await response.text()).toContain(`ngCspNonce="${nonce}"`);
      expect(response.headers()['cache-control']).toContain('no-store');
    });

    test('uses a different nonce for every document request', async ({ request }) => {
      const first = await request.get('/');
      const second = await request.get('/');
      expect(nonceFromCsp(first.headers()['content-security-policy'])).not.toBe(
        nonceFromCsp(second.headers()['content-security-policy']),
      );
    });

    test('keeps the other security headers on the document', async ({ request }) => {
      const headers = (await request.get('/')).headers();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['strict-transport-security']).toContain('max-age=');
    });

    test('serves hashed assets with the static CSP, not a nonce', async ({ request }) => {
      const html = await (await request.get('/')).text();
      const script = /src="(main-[A-Z0-9]+\.js)"/.exec(html)?.[1];
      expect(script).toBeDefined();
      const response = await request.get(`/${script}`);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-security-policy']).toBe(staticCsp);
    });

    test('keeps helmet CSP on the API, without a nonce', async ({ request }) => {
      const response = await request.get('/api/health');
      expect(response.status()).toBe(200);
      const csp = response.headers()['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).not.toContain('nonce-');
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
