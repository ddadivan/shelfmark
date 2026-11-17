import { join } from 'node:path';
import { defineConfig } from '@playwright/test';
import { getReadyUrl, workspaceRoot } from '@nx/devkit';

const port = process.env['WHATS_NEW_PORT'] ?? '4219';
const origin = `http://localhost:${port}`;

/**
 * The "What's new" screenshot generator (#442), kept apart from the e2e suite like the promo
 * recorder: its own test file pattern, one worker, no retries. It serves the web app with its mock
 * APIs; a server already running on the port is reused.
 */
export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: 'capture-whats-new-media.mts',
  outputDir: join(workspaceRoot, 'dist/.playwright/apps/web-e2e/whats-new-media'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: 'list',
  use: { baseURL: origin, browserName: 'chromium' },
  webServer: {
    command: `npx nx run web:serve --port=${port}`,
    url: getReadyUrl(origin),
    reuseExistingServer: true,
    timeout: 300_000,
    cwd: workspaceRoot,
  },
});
