import { buildCsp } from './build-csp';
import { generateNonce } from './generate-nonce';
import { injectNonce } from './inject-nonce';
import { isHtmlDocumentPath } from './is-html-document-path';
import { CSP_NONCE_PLACEHOLDER } from './models/csp-nonce-placeholder.const';

/** Query parameter the Angular service worker adds to its own fetches of ngsw.json and assets. */
const SERVICE_WORKER_CACHE_BUST_PARAM = 'ngsw-cache-bust';

/**
 * Builds the Vercel Routing Middleware handler. Returns a `Response` for HTML document requests
 * and `undefined` (continue) for everything else. Throws when the shell has no placeholder, so a
 * broken build fails closed instead of serving a shell whose styles the CSP blocks.
 */
export function createCspMiddleware(shellHtml: string): (request: Request) => Response | undefined {
  if (!shellHtml.includes(CSP_NONCE_PLACEHOLDER)) {
    throw new Error(`The app shell has no ${CSP_NONCE_PLACEHOLDER} placeholder`);
  }

  return (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return undefined;
    }
    if (!isHtmlDocumentPath(new URL(request.url).pathname)) {
      return undefined;
    }

    // The Angular service worker fetches `/index.html?ngsw-cache-bust=…` to prefetch the shell and
    // checks the bytes against the hash in ngsw.json. A random nonce would fail that check, so it
    // gets the shell exactly as built, with the placeholder as its nonce. The copy only serves as
    // the offline fallback; online navigations always get a fresh nonce (`freshness` strategy).
    const nonce = new URL(request.url).searchParams.has(SERVICE_WORKER_CACHE_BUST_PARAM)
      ? CSP_NONCE_PLACEHOLDER
      : generateNonce();
    return new Response(request.method === 'HEAD' ? null : injectNonce(shellHtml, nonce), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': buildCsp(nonce),
        'Cache-Control': 'private, no-store',
      },
    });
  };
}
