// Lighthouse CI budget (issue #111, ADR 0018). Runs against the `e2e` static build, the same
// bytes the Playwright suite serves. Not a required check: see the `lighthouse` job in ci.yml.
// Run locally: `npx nx run web-e2e:lighthouse` (needs `npx playwright install chromium`).
const { chromium } = require('@playwright/test');

const port = process.env.LHCI_PORT ?? '4300';
const origin = `http://localhost:${port}`;

// Extension point: add the main screen here once it exists (#74). It needs a signed-in session
// or a stub API first, so only public pages belong in this list until then.
const paths = ['/'];

module.exports = {
  ci: {
    collect: {
      url: paths.map((path) => `${origin}${path}`),
      numberOfRuns: 3,
      // Serves the already built `e2e` bundle; the Nx target builds it first (cached).
      // Nested `nx` call is intentional: lhci starts and stops this server around its runs.
      startServerCommand: `npx nx run web:serve-static:e2e --port=${port}`,
      startServerReadyPattern: 'Available on',
      startServerReadyTimeout: 180000,
      // Same Chromium Playwright installs for e2e (CHROME_PATH overrides).
      chromePath: process.env.CHROME_PATH || chromium.executablePath(),
      settings: {
        // CI runners have no user namespace sandbox; locally keep it on.
        chromeFlags: process.env.CI ? '--no-sandbox --headless=new' : '--headless=new',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      // No external upload: reports stay on disk and go to a CI artifact.
      target: 'filesystem',
      outputDir: 'dist/lighthouse',
    },
  },
};
