import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { getReadyUrl, workspaceRoot } from '@nx/devkit';
// Explicit `.ts` extensions: Nx loads this config with Node's native type stripping.
import { E2E_PROJECT } from './src/models/e2e-project.const.ts';
import { E2E_TAG } from './src/models/e2e-tag.const.ts';
import type { E2eTag } from './src/models/e2e-tag.type.ts';

const isCI = !!process.env['CI'];
const port = process.env['E2E_PORT'] ?? '4200';
const origin = `http://localhost:${port}`;
const deployedUrl = process.env['BASE_URL'];
const baseURL = deployedUrl || getReadyUrl(origin);
// CI builds the `e2e` bundle once in the `web-build` job and the shards download it into
// dist/apps/web-e2e-build (#362): `web:serve-prebuilt` then serves it as it is, without a build.
const prebuilt = process.env['E2E_PREBUILT'] === 'true';

/** The local dev server; on CI the `e2e` build (production plus the hidden /__e2e/csp page). */
function serveCommand(): string {
  if (!isCI) return `npx nx run web:serve --port=${port}`;
  return `npx nx run web:${prebuilt ? 'serve-prebuilt' : 'serve-static:e2e'} --port=${port}`;
}

/** Matches a test that carries one of the tags (ADR 0043): `tablet` and `phone` run only those. */
function taggedWith(...tags: E2eTag[]): RegExp {
  return new RegExp(`(^|\\s)(${tags.join('|')})(\\s|$)`);
}

const preset = nxE2EPreset(import.meta.dirname, { testDir: './src' });
// CI also lists the tests that passed only on a retry (#362). The full run's `--reporter=blob,line`
// replaces this list, so ci.yml names the flaky reporter there too.
const FLAKY_REPORTER = './reporters/flaky.reporter.ts';

// Generated as .mts so Node forces ESM; Playwright auto-discovers playwright.config.mts.
export default defineConfig({
  ...preset,
  reporter: isCI ? [...(preset.reporter ?? []), [FLAKY_REPORTER]] : preset.reporter,
  forbidOnly: isCI,
  // One retry (ADR 0043): the baseline had no flaky test, and two retries hid flakes and tripled
  // the cost of a real failure.
  retries: isCI ? 1 : 0,
  // The Nx preset runs one worker on CI, so ~350 tests (desktop + phone) ran one by one for about
  // 10 minutes. GitHub's ubuntu-latest runner has 4 vCPUs; the specs are `fullyParallel` and keep
  // no shared state (the static server only serves files), so they run in parallel there too.
  workers: isCI ? 4 : undefined,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // Against a deployed URL there is nothing to start.
  webServer: deployedUrl
    ? undefined
    : {
        command: serveCommand(),
        url: getReadyUrl(origin),
        reuseExistingServer: !isCI,
        timeout: 180_000,
        cwd: workspaceRoot,
      },
  // Desktop runs every test. The touch projects run only the tests tagged for them (ADR 0043):
  // most feature flows share their code with desktop, so a full repeat only cost time.
  projects: [
    { name: E2E_PROJECT.Desktop, use: { ...devices['Desktop Chrome'] } },
    // iPad portrait (#316): below 64em, so the mobile shell with the tab bar, at a width that
    // shows two to three columns; touch, so hover-only controls are always visible.
    {
      name: E2E_PROJECT.Tablet,
      grep: taggedWith(E2E_TAG.Mobile, E2E_TAG.Tablet),
      use: {
        ...devices['iPad (gen 7)'],
        defaultBrowserType: 'chromium',
        viewport: { width: 820, height: 1180 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: E2E_PROJECT.Phone,
      grep: taggedWith(E2E_TAG.Mobile, E2E_TAG.Phone),
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 360, height: 780 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
