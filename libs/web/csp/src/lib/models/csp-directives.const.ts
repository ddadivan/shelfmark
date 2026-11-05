/**
 * The web Content-Security-Policy (docs/SETUP.md 5.6), directive name to sources.
 * `style-src` gets the per-request nonce appended by `buildCsp`.
 */
export const CSP_DIRECTIVES: Readonly<Record<string, readonly string[]>> = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'font-src': ["'self'"],
  'img-src': ["'self'", 'data:'],
  'connect-src': ["'self'"],
  'base-uri': ["'self'"],
  'frame-ancestors': ["'none'"],
  'object-src': ["'none'"],
  'form-action': ["'self'"],
};
