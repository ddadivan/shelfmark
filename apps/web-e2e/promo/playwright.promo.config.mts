import { join } from 'node:path';
import { defineConfig } from '@playwright/test';
import { getReadyUrl, workspaceRoot } from '@nx/devkit';

const port = process.env['PROMO_PORT'] ?? '4218';
const origin = `http://localhost:${port}`;

/**
 * The promo recorder (#271), kept apart from the e2e suite: its own test file pattern and
 * output folder, one worker (recordings are timed), no retries. It serves the e2e build (mock
 * APIs) like CI; a server already running on the port is reused.
 */
export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: 'record-promo.mts',
  outputDir: join(workspaceRoot, 'dist/.playwright/apps/web-e2e/promo'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  reporter: 'list',
  use: { baseURL: origin, browserName: 'chromium' },
  webServer: {
    command: `npx nx run web:serve-static:e2e --port=${port}`,
    url: getReadyUrl(origin),
    reuseExistingServer: true,
    timeout: 300_000,
    cwd: workspaceRoot,
  },
});
