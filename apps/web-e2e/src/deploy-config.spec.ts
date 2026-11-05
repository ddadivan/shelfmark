import { expect, test } from '@playwright/test';
import {
  headerRulesWithCsp,
  readCsp,
  readCspFromSetupDoc,
  readVercelConfig,
  sourceToRegExp,
} from './support/vercel-config';

const config = readVercelConfig();
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
    for (const path of ['/', '/folders/42', '/settings']) {
      expect(regexp.test(path), path).toBe(true);
    }
  });

  test('API rewrite sends /api/* to the function', () => {
    const api = config.rewrites.find((r) => r.destination === '/api');
    expect(api).toBeDefined();
    const regexp = sourceToRegExp(api?.source ?? '');
    for (const path of ['/api/health', '/api/docs']) {
      expect(regexp.test(path), path).toBe(true);
    }
  });

  test('functions run in fra1 only', () => {
    expect(config.regions).toEqual(['fra1']);
  });

  test('dependabot branches are not deployed', () => {
    expect(config.git.deploymentEnabled['dependabot/**']).toBe(false);
  });
});
