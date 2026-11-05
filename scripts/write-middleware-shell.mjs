// Writes the built app shell as a JS module for the Vercel Routing Middleware (ADR 0022).
//
// The middleware imports `dist/apps/web/middleware/shell.mjs`, so Vercel's bundler inlines the
// shell and no request has to fetch `/index.html`. The build fails unless the shell holds the
// nonce placeholder: a shell without it would serve styles the CSP blocks.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Mirrors CSP_NONCE_PLACEHOLDER in libs/web/csp (the app's index.html uses the same literal).
const PLACEHOLDER = 'CSP_NONCE_PLACEHOLDER';
// The route path of the e2e-only CSP test page (apps/web/src/app/app.routes.e2e.ts).
const E2E_ROUTE = '__e2e/csp';
const browserDir = join('dist', 'apps', 'web', 'browser');
const indexPath = join(browserDir, 'index.html');
const outDir = join('dist', 'apps', 'web', 'middleware');

if (!existsSync(indexPath)) {
  throw new Error(`${indexPath} not found: run the web build first (nx build web)`);
}

// The hidden CSP test page (`/__e2e/csp`) exists only in the `e2e` build configuration. A
// production bundle that mentions it was built from the wrong configuration: fail the deploy.
for (const file of readdirSync(browserDir, { recursive: true })) {
  if (
    /\.(?:js|html)$/.test(String(file)) &&
    readFileSync(join(browserDir, String(file)), 'utf8').includes(E2E_ROUTE)
  ) {
    throw new Error(
      `${join(browserDir, String(file))} contains the e2e-only route; build the production configuration`,
    );
  }
}

const html = readFileSync(indexPath, 'utf8');
const count = html.split(PLACEHOLDER).length - 1;
// Angular copies `ngCspNonce` onto the stylesheet, modulepreload and script tags it emits, so the
// built shell holds the placeholder several times; the middleware replaces all of them.
if (count < 1) {
  throw new Error(`${indexPath} must contain ${PLACEHOLDER}, found none`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'shell.mjs'), `export const shellHtml = ${JSON.stringify(html)};\n`);
writeFileSync(join(outDir, 'shell.d.mts'), 'export declare const shellHtml: string;\n');
console.log(`Wrote ${join(outDir, 'shell.mjs')} (${html.length} bytes)`);
