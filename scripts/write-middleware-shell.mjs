// Writes the built app shell as a JS module for the Vercel Routing Middleware (ADR 0022).
//
// The middleware imports `dist/apps/web/middleware/shell.mjs`, so Vercel's bundler inlines the
// shell and no request has to fetch `/index.html`. The build fails unless the shell holds the
// nonce placeholder: a shell without it would serve styles the CSP blocks.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PLACEHOLDER = 'CSP_NONCE_PLACEHOLDER';
const indexPath = join('dist', 'apps', 'web', 'browser', 'index.html');
const outDir = join('dist', 'apps', 'web', 'middleware');

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
