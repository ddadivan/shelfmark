import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { getReadyUrl, workspaceRoot } from '@nx/devkit';

const isCI = !!process.env['CI'];
const port = process.env['E2E_PORT'] ?? '4200';
const origin = `http://localhost:${port}`;
const deployedUrl = process.env['BASE_URL'];
const baseURL = deployedUrl || getReadyUrl(origin);

// Generated as .mts so Node forces ESM; Playwright auto-discovers playwright.config.mts.
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
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
        // CI serves the `e2e` build: the production build plus the hidden /__e2e/csp test page.
        command: `npx nx run web:${isCI ? 'serve-static:e2e' : 'serve'} --port=${port}`,
        url: getReadyUrl(origin),
        reuseExistingServer: !isCI,
        timeout: 180_000,
        cwd: workspaceRoot,
      },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'phone',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 360, height: 780 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
