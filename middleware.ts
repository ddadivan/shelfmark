// Vercel Routing Middleware: per-request CSP nonce for the app shell (ADR 0022, issue #9).
//
// Logic lives in the tested lib `libs/web/csp`; this file only wires it. The lib is imported by
// relative path because Vercel's bundler does not read `tsconfig.base.json` paths. `shell.mjs` is
// written after the web build by `nx run web:middleware-shell`.
import { createCspMiddleware } from './libs/web/csp/src/index';
import { shellHtml } from './dist/apps/web/middleware/shell.mjs';

// Vercel reads `config` by static analysis, so it must be literals. The matcher must equal
// `HTML_MATCHER` in the lib (checked by apps/web-e2e deploy-config.spec.ts).
export const config = {
  runtime: 'edge',
  matcher: ['/((?!api(?:/|$))(?:.*/)?[^./]*)', '/index.html'],
};

export default createCspMiddleware(shellHtml);
