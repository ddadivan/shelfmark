import { defineConfig, devices } from '@playwright/test';
import { getReadyUrl, workspaceRoot } from '@nx/devkit';

const isCI = !!process.env['CI'];
const port = process.env['E2E_PORT'] ?? '4200';
// IPv4 loopback, not `localhost`: in the CI container `localhost` resolves to ::1 first, while the
// static server listens on IPv4 and answers deep links (/sign-in, /links) through a proxy to
// itself; with `localhost` that proxy fails and every route but `/` is a 404.
const LOOPBACK = '127.0.0.1';
const origin = `http://${LOOPBACK}:${port}`;

/** The two colour schemes every screen is captured in. */
const SCHEMES = ['light', 'dark'] as const;

/** The three form factors of the main e2e config, same sizes (desktop, iPad portrait, phone). */
const DEVICES = {
  desktop: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
  tablet: {
    ...devices['iPad (gen 7)'],
    defaultBrowserType: 'chromium',
    viewport: { width: 820, height: 1180 },
    isMobile: true,
    hasTouch: true,
  },
  phone: {
    ...devices['Pixel 7'],
    viewport: { width: 360, height: 780 },
    isMobile: true,
    hasTouch: true,
  },
} as const;

/**
 * Visual regression (#340), kept apart from the e2e suite: its own specs
 * (`*.visual.spec.ts`), baselines and output folder, so `nx e2e web-e2e` and its sharding are
 * untouched. Baselines are generated in the CI container (Linux fonts), see README.md.
 */
export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: '*.visual.spec.ts',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  outputDir: `${workspaceRoot}/dist/.playwright/apps/web-e2e/visual`,
  forbidOnly: isCI,
  // CI never writes a missing baseline on its own (a new screen would pass unchecked): it fails, and
  // the `visual:update` label regenerates the baselines on purpose (README).
  updateSnapshots: isCI ? 'none' : 'missing',
  fullyParallel: true,
  retries: isCI ? 1 : 0,
  workers: isCI ? 4 : undefined,
  reporter: isCI
    ? [
        ['list'],
        [
          'html',
          {
            open: 'never',
            outputFolder: `${workspaceRoot}/dist/.playwright/apps/web-e2e/visual-report`,
          },
        ],
      ]
    : 'list',
  expect: {
    toHaveScreenshot: {
      // Anti-aliasing differences of the same Chromium build stay below 0.2 per pixel; a real
      // change (colour, spacing, a missing element) moves far more than 0.2% of the pixels.
      threshold: 0.2,
      maxDiffPixelRatio: 0.002,
    },
  },
  use: {
    baseURL: origin,
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    trace: 'off',
  },
  webServer: {
    command: `npx nx run web:serve-static:e2e --port=${port} --host=${LOOPBACK} "--proxyUrl=${origin}?"`,
    url: getReadyUrl(origin),
    reuseExistingServer: !isCI,
    timeout: 300_000,
    cwd: workspaceRoot,
  },
  projects: SCHEMES.flatMap((colorScheme) =>
    (Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((device) => ({
      name: `${device}-${colorScheme}`,
      use: { ...DEVICES[device], colorScheme, deviceScaleFactor: 1 },
    })),
  ),
});
