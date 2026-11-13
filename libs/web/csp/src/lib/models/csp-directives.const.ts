/**
 * The web Content-Security-Policy (docs/SETUP.md 5.6), directive name to sources.
 * `style-src` gets the per-request nonce appended by `buildCsp`.
 */
export const CSP_DIRECTIVES: Readonly<Record<string, readonly string[]>> = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'font-src': ["'self'"],
  // The profile photo comes from the sign-in provider (#352): Google serves it from several
  // `*.googleusercontent.com` hosts (lh3 to lh6 and others); GitHub from one exact host.
  'img-src': [
    "'self'",
    'data:',
    'https://*.googleusercontent.com',
    'https://avatars.githubusercontent.com',
  ],
  'connect-src': ["'self'"],
  'base-uri': ["'self'"],
  'frame-ancestors': ["'none'"],
  'object-src': ["'none'"],
  'form-action': ["'self'"],
};
