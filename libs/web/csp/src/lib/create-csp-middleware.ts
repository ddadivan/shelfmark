import { buildCsp } from './build-csp';
import { generateNonce } from './generate-nonce';
import { injectNonce } from './inject-nonce';
import { isHtmlDocumentPath } from './is-html-document-path';
import { CSP_NONCE_PLACEHOLDER } from './models/csp-nonce-placeholder.const';

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

    const nonce = generateNonce();
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
