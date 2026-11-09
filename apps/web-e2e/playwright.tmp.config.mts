import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { getReadyUrl, workspaceRoot } from '@nx/devkit';

const port = process.env['E2E_PORT'] ?? '4220';
const origin = `http://localhost:${port}`;
const executablePath = '/opt/pw-browsers/chromium';

export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  forbidOnly: true,
  retries: 2,
  workers: 4,
  use: { baseURL: getReadyUrl(origin), trace: 'off', launchOptions: { executablePath } },
  webServer: {
    command: `npx nx run web:serve-static:e2e --port=${port}`,
    url: getReadyUrl(origin),
    reuseExistingServer: true,
    timeout: 300_000,
    cwd: workspaceRoot,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
    {
      name: 'phone',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 360, height: 780 },
        isMobile: true,
        hasTouch: true,
        launchOptions: { executablePath },
      },
    },
  ],
});
