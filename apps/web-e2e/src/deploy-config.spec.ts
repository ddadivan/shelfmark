import { expect, test } from '@playwright/test';
import {
  headerRulesWithCsp,
  readCsp,
  readCspFromSetupDoc,
  readVercelConfig,
  sourceToRegExp,
} from './support/vercel-config';

const config = readVercelConfig();
const apiRewrite = config.rewrites[0];
const apiPaths = ['/api', '/api/', '/api/health', '/api/docs', '/api/folders/1'];

test.describe('vercel.json deployment config', () => {
  test('CSP equals the policy documented in SETUP.md 5.6', () => {
    expect(readCsp(config)).toBe(readCspFromSetupDoc());
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

  test('CSP rule matches the app shell and deep links', () => {
    const [rule] = headerRulesWithCsp(config);
    const regexp = sourceToRegExp(rule.source);
    for (const path of ['/', '/folders/42', '/index.html']) {
      expect(regexp.test(path), path).toBe(true);
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
    const regexp = sourceToRegExp(rule?.source ?? '');
    for (const path of ['/missing.js', '/nonexistent.woff2', '/media/x.woff2', '/a/b/app.css']) {
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
});
