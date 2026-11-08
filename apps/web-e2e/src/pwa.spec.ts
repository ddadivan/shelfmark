import { expect, test } from '@playwright/test';

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface Manifest {
  id: string;
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: ManifestIcon[];
  share_target?: { action: string; method: string; params: Record<string, string> };
}

// Local `nx serve` is a development build without a service worker; CI and a deployed URL are
// production builds (see playwright.config.mts).
const isProductionBuild = !!process.env['CI'] || !!process.env['BASE_URL'];

test.describe('PWA manifest', () => {
  test('is linked, valid and installable', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      'manifest.webmanifest',
    );

    const response = await request.get(new URL('manifest.webmanifest', page.url()).toString());
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/json/);
    const manifest = (await response.json()) as Manifest;

    expect(manifest.name).toBe('Shelfmark');
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.id).toBe('/');
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.icons.some((i) => i.sizes === '192x192' && i.purpose === 'any')).toBe(true);
    expect(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any')).toBe(true);
    expect(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(
      true,
    );

    for (const icon of manifest.icons) {
      const iconResponse = await request.get(new URL(icon.src, response.url()).toString());
      expect(iconResponse.status(), icon.src).toBe(200);
      expect(iconResponse.headers()['content-type'], icon.src).toBe(icon.type);
    }
  });

  test('registers the Android share target (GET /share with url, text, title)', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    const response = await request.get(new URL('manifest.webmanifest', page.url()).toString());
    const manifest = (await response.json()) as Manifest;

    expect(manifest.share_target).toEqual({
      action: '/share',
      method: 'GET',
      params: { url: 'url', text: 'text', title: 'title' },
    });
  });

  test('declares a theme colour per colour scheme and the iOS meta tags', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
    await expect(
      page.locator('meta[name="theme-color"][media="(prefers-color-scheme: light)"]'),
    ).toHaveAttribute('content', /^#[0-9a-f]{6}$/i);
    await expect(
      page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]'),
    ).toHaveAttribute('content', /^#[0-9a-f]{6}$/i);
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
      'content',
      'yes',
    );
    const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect((await page.request.get(touchIcon ?? '/missing')).status()).toBe(200);
  });
});

test.describe('service worker', () => {
  test.skip(!isProductionBuild, 'the development build registers no service worker');

  test('ships ngsw.json that caches the shell but never /api', async ({ request }) => {
    const worker = await request.get('/ngsw-worker.js');
    expect(worker.status()).toBe(200);
    expect(worker.headers()['content-type']).toMatch(/javascript/);

    const response = await request.get('/ngsw.json');
    expect(response.status()).toBe(200);
    const config = (await response.json()) as {
      dataGroups: unknown[];
      navigationUrls: { positive: boolean; regex: string }[];
      assetGroups: { urls: string[] }[];
    };
    expect(config.dataGroups).toEqual([]);
    expect(
      config.assetGroups.flatMap((g) => g.urls).filter((url) => url.startsWith('/api')),
    ).toEqual([]);
    const excluded = config.navigationUrls
      .filter((rule) => !rule.positive)
      .map((rule) => new RegExp(rule.regex));
    expect(excluded.some((re) => re.test('/api/auth/callback/github'))).toBe(true);
    // The share target opens `/share?...`: a navigation that must fall back to the shell.
    expect(excluded.some((re) => re.test('/share'))).toBe(false);
    expect(
      config.navigationUrls.some((rule) => rule.positive && new RegExp(rule.regex).test('/share')),
    ).toBe(true);
  });

  test('registers and takes control after the first load', async ({ page }) => {
    await page.goto('/');

    // String expression: this project has no DOM lib.
    const scope = await page.evaluate<string>(
      'navigator.serviceWorker.ready.then((registration) => registration.scope)',
    );
    expect(scope).toBe(new URL('/', page.url()).toString());
  });
});
