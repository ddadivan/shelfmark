import { defineConfig, devices } from '@playwright/test';

const port = process.env['STORYBOOK_PORT'] ?? '6007';

// Not named playwright.config.*, so the Nx Playwright plugin does not infer an `e2e` target.
export default defineConfig({
  testDir: '.',
  testMatch: 'storybook.a11y.mts',
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: process.env['CI'] ? [['list'], ['github']] : 'list',
  outputDir: '../../../dist/.playwright/libs/ui/test-output',
  use: { baseURL: `http://127.0.0.1:${port}`, ...devices['Desktop Chrome'] },
  webServer: {
    command: 'node libs/ui/a11y/serve-storybook.mjs',
    cwd: '../../..',
    url: `http://127.0.0.1:${port}/index.json`,
    reuseExistingServer: false,
    env: { STORYBOOK_PORT: port },
  },
});
