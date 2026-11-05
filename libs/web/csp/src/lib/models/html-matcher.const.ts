/**
 * Paths the middleware handles: the SPA rewrite source from `vercel.json` plus `/index.html`.
 * `middleware.ts` repeats these literals in its `config` (Vercel reads them by static analysis);
 * an e2e config test keeps both copies equal.
 */
export const HTML_MATCHER: readonly string[] = ['/((?!api(?:/|$))(?:.*/)?[^./]*)', '/index.html'];
