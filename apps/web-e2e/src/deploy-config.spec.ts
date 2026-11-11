import { expect, test } from './support/test';
import { buildCsp, HTML_MATCHER } from '@shelfmark/web-csp';
import {
  headerRulesWithCsp,
  readCsp,
  readCspFromSetupDoc,
  readCspTemplateFromSetupDoc,
  readMiddlewareMatcher,
  readVercelConfig,
  sourceToRegExp,
} from './support/vercel-config';

const config = readVercelConfig();
const apiRewrite = config.rewrites.find(
  (r) => r.destination === '/api' && r.source.startsWith('/api/'),
) ?? { source: '', destination: '' };
const apiPaths = ['/api', '/api/', '/api/health', '/api/docs', '/api/folders/1'];

test.describe('vercel.json deployment config', () => {
  test('static CSP equals the policy documented in SETUP.md 5.6 and the lib', () => {
    expect(readCsp(config)).toBe(readCspFromSetupDoc());
    expect(readCsp(config)).toBe(buildCsp(null));
  });

  test('SETUP.md 5.6 document CSP template equals the lib policy with a nonce', () => {
    expect(readCspTemplateFromSetupDoc()).toBe(buildCsp('{nonce}'));
  });

  test('middleware.ts matcher equals the lib HTML_MATCHER', () => {
    expect(readMiddlewareMatcher()).toEqual([...HTML_MATCHER]);
  });

  test('the build command also writes the middleware shell', () => {
    expect(config.buildCommand).toContain('middleware-shell');
  });

  test('CSP is strict: no unsafe-inline, no unsafe-eval, no wildcard sources', () => {
    const csp = readCsp(config);
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(csp).not.toMatch(/\s\*(\s|;|$)/);
  });

  for (const path of apiPaths) {
    test(`no CSP header rule matches ${path}`, () => {
      for (const rule of headerRulesWithCsp(config)) {
        expect(sourceToRegExp(rule.source).test(path), rule.source).toBe(false);
      }
    });
  }

  // HTML documents get their CSP (with a nonce) from the middleware; two policies must never
  // meet on one response, so the static rule covers file-like paths only.
  test('static CSP rule matches no HTML document path', () => {
    for (const rule of headerRulesWithCsp(config)) {
      const regexp = sourceToRegExp(rule.source);
      for (const path of ['/', '/folders/42', '/folders/42/', '/u/john.doe/links', '/index.html']) {
        expect(regexp.test(path), path).toBe(false);
      }
    }
  });

  test('static CSP rule matches file paths, including missing files', () => {
    for (const rule of headerRulesWithCsp(config)) {
      const regexp = sourceToRegExp(rule.source);
      for (const path of [
        '/main-ABCD1234.js',
        '/missing.js',
        '/favicon.ico',
        '/assets/ui/icons.svg',
      ]) {
        expect(regexp.test(path), path).toBe(true);
      }
    }
  });

  test('the other security headers still apply to every non-API path', () => {
    const rule = config.headers.find((r) =>
      r.headers.some((h) => h.key === 'X-Content-Type-Options'),
    );
    expect(rule).toBeDefined();
    const regexp = sourceToRegExp(rule?.source ?? '');
    for (const path of ['/', '/folders/42', '/index.html', '/main-ABCD1234.js', '/missing.js']) {
      expect(regexp.test(path), path).toBe(true);
    }
    for (const path of apiPaths) {
      expect(regexp.test(path), path).toBe(false);
    }
  });

  test('middleware matcher covers HTML paths and no API or file path', () => {
    const patterns = readMiddlewareMatcher().map((source) => sourceToRegExp(source));
    const matches = (path: string) => patterns.some((pattern) => pattern.test(path));
    for (const path of ['/', '/folders/42', '/u/john.doe/links', '/index.html']) {
      expect(matches(path), path).toBe(true);
    }
    for (const path of [...apiPaths, '/main-ABCD1234.js', '/missing.js', '/favicon.ico']) {
      expect(matches(path), path).toBe(false);
    }
  });

  test('SPA rewrite does not match /api paths but matches app routes', () => {
    const spa = config.rewrites.find((r) => r.destination === '/index.html');
    expect(spa).toBeDefined();
    const regexp = sourceToRegExp(spa?.source ?? '');
    for (const path of apiPaths) {
      expect(regexp.test(path), path).toBe(false);
    }
    for (const path of [
      '/',
      '/folders/42',
      '/settings',
      '/library/x',
      '/folders/42/',
      '/u/john.doe/links',
    ]) {
      expect(regexp.test(path), path).toBe(true);
    }
  });

  test('SPA rewrite leaves paths with a file extension alone', () => {
    const spa = config.rewrites.find((r) => r.destination === '/index.html');
    const regexp = sourceToRegExp(spa?.source ?? '');
    for (const path of ['/missing.js', '/media/x.woff2', '/assets/deep/app.css', '/favicon.ico']) {
      expect(regexp.test(path), path).toBe(false);
    }
  });

  // Vercel serves the app shell (200) for missing files even without rewrites and with the
  // Framework Preset set to Other (issue #13, ADR 0019). This rule sends file-like paths to `/api`,
  // which Vercel answers with a real 404 for a non-API source (observed, not documented).
  test('missing-file rule matches file-like paths only, never app routes or /api', () => {
    const rule = config.rewrites.find(
      (r) => r.source !== apiRewrite.source && r.destination === '/api',
    );
    expect(rule).toBeDefined();
    // Order is a requirement: the API rule must come first, so `/api/v1/file.json` reaches the API.
    expect(config.rewrites[0]).toEqual(apiRewrite);
    expect(sourceToRegExp(apiRewrite.source).test('/api/v1/file.json')).toBe(true);
    const regexp = sourceToRegExp(rule?.source ?? '');
    expect(regexp.test('/api/v1/file.json')).toBe(false);
    // Look-alikes of /api are not API paths and get the missing-file 404.
    for (const path of [
      '/missing.js',
      '/nonexistent.woff2',
      '/media/x.woff2',
      '/a/b/app.css',
      '/api.json',
      '/apix/a.js',
    ]) {
      expect(regexp.test(path), path).toBe(true);
    }
    for (const path of [
      '/',
      '/folders/42',
      '/u/john.doe/links',
      '/api/health',
      '/api/docs/swagger-ui.css',
    ]) {
      expect(regexp.test(path), path).toBe(false);
    }
  });

  test('public collections (/c/:token) are noindex, nothing else is (ADR 0040)', () => {
    const rules = config.headers.filter((rule) =>
      rule.headers.some((h) => h.key === 'X-Robots-Tag'),
    );
    expect(rules).toHaveLength(1);
    expect(rules[0].headers).toEqual([{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]);
    const regexp = sourceToRegExp(rules[0].source);
    expect(regexp.test('/c/sampleToken-sampleToke')).toBe(true);
    for (const path of ['/', '/links', '/about', '/collections', '/api/c/x']) {
      expect(regexp.test(path), path).toBe(false);
    }
  });

  test('hashed js and css share one immutable cache rule', () => {
    const rules = config.headers.filter((rule) =>
      rule.headers.some((h) => h.key === 'Cache-Control' && h.value.includes('immutable')),
    );
    const hashed = rules.filter((rule) => rule.source.includes('{8}'));
    expect(hashed).toHaveLength(1);
    const regexp = sourceToRegExp(hashed[0].source);
    for (const path of ['/main-ABCD1234.js', '/styles-ABCD1234.css']) {
      expect(regexp.test(path), path).toBe(true);
    }
    expect(regexp.test('/main.js')).toBe(false);
  });

  test('service worker files are revalidated and the manifest has its media type', () => {
    const cacheRule = config.headers.find((r) =>
      r.headers.some((h) => h.key === 'Cache-Control' && h.value === 'no-cache'),
    );
    const regexp = sourceToRegExp(cacheRule?.source ?? '');
    for (const path of [
      '/ngsw.json',
      '/ngsw-worker.js',
      '/safety-worker.js',
      '/worker-basic.min.js',
    ]) {
      expect(regexp.test(path), path).toBe(true);
    }
    expect(regexp.test('/main-ABCD1234.js')).toBe(false);
    expect(cacheRule?.headers).toEqual([{ key: 'Cache-Control', value: 'no-cache' }]);

    const manifestRule = config.headers.find((r) => r.source.includes('manifest'));
    expect(sourceToRegExp(manifestRule?.source ?? '').test('/manifest.webmanifest')).toBe(true);
    expect(manifestRule?.headers).toContainEqual({
      key: 'Content-Type',
      value: 'application/manifest+json; charset=utf-8',
    });
  });

  test('service worker and manifest files are file-like paths, never HTML documents', () => {
    const patterns = readMiddlewareMatcher().map((source) => sourceToRegExp(source));
    const spa = sourceToRegExp(
      config.rewrites.find((r) => r.destination === '/index.html')?.source ?? '',
    );
    for (const path of [
      '/ngsw.json',
      '/ngsw-worker.js',
      '/safety-worker.js',
      '/worker-basic.min.js',
      '/manifest.webmanifest',
    ]) {
      expect(
        patterns.some((pattern) => pattern.test(path)),
        path,
      ).toBe(false);
      expect(spa.test(path), path).toBe(false);
    }
  });

  test('API rewrite sends /api/* to the function without named params', () => {
    const regexp = sourceToRegExp(apiRewrite.source);
    for (const path of ['/api/health', '/api/docs', '/api/docs/swagger-ui.css']) {
      expect(regexp.test(path), path).toBe(true);
    }
    expect(regexp.test('/api'), '/api').toBe(false);
    // Vercel appends every named param the destination does not use as a query parameter.
    expect(apiRewrite.source).not.toMatch(/:\w+/);
    expect(apiRewrite.destination).toBe('/api');
  });

  test('functions run in fra1 only', () => {
    expect(config.regions).toEqual(['fra1']);
  });

  test('dependabot branches are not deployed', () => {
    expect(config.git.deploymentEnabled['dependabot/**']).toBe(false);
  });

  test('only main deploys: every prefixed branch (feat/, fix/, chore/, …) is off', () => {
    expect(config.git.deploymentEnabled['*/**']).toBe(false);
    expect(config.git.deploymentEnabled['main']).toBeUndefined();
  });
});
