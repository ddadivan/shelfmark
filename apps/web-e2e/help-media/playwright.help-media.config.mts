import { join } from 'node:path';
import { defineConfig } from '@playwright/test';
import { getReadyUrl, workspaceRoot } from '@nx/devkit';

const port = process.env['HELP_MEDIA_PORT'] ?? '4220';
const origin = `http://localhost:${port}`;

/**
 * The Help center screenshot generator, kept apart from the e2e suite like the What's new one: its
 * own test file pattern, one worker, no retries. It serves the web app with its mock APIs; a
 * server already running on the port is reused.
 */
export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: 'capture-help-media.mts',
  outputDir: join(workspaceRoot, 'dist/.playwright/apps/web-e2e/help-media'),
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 180_000,
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
