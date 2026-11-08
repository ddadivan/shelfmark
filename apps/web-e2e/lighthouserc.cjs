// Lighthouse CI budget (issue #111, ADR 0018). Runs against the `e2e` static build, the same
// bytes the Playwright suite serves. Not a required check: see the `lighthouse` job in ci.yml.
// The bytes are the same, but the server is `tools/lighthouse/serve.mjs`, not the Nx file server:
// production (Vercel) answers with brotli / gzip, the file server sends raw bytes, and Lighthouse's
// simulated 4G then charges about 3x the real transfer cost. Compression only; no other headers
// change (the CSP comes from the Vercel middleware). The assertions below are the budget, untouched.
// Run locally: `npx nx run web-e2e:lighthouse` (needs `npx playwright install chromium`).
const { chromium } = require('@playwright/test');

const port = process.env.LHCI_PORT ?? '4300';
const origin = `http://127.0.0.1:${port}`;

// Extension point: add the main screen here once it exists (#74). It needs a signed-in session
// or a stub API first, so only public pages belong in this list until then.
const paths = ['/'];

module.exports = {
  ci: {
    collect: {
      url: paths.map((path) => `${origin}${path}`),
      numberOfRuns: 3,
      // Serves the `e2e` bundle (the Nx target builds it first, nested and cached; a `dependsOn` with
      // a configuration does not resolve for this target, so the build is an explicit step),
      // compressed like production; lhci starts and stops this server around its runs.
      startServerCommand: `node tools/lighthouse/serve.mjs dist/apps/web-e2e-build/browser ${port}`,
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
