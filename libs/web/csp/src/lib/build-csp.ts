import { CSP_DIRECTIVES } from './models/csp-directives.const';

/**
 * Builds the CSP header value. With a nonce, `style-src` also allows that nonce (HTML documents);
 * with `null` it is the static policy for files and the documented policy in docs/SETUP.md 5.6.
 */
export function buildCsp(nonce: string | null): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([name, sources]) => {
      const all =
        name === 'style-src' && nonce !== null ? [...sources, `'nonce-${nonce}'`] : sources;
      return `${name} ${all.join(' ')}`;
    })
    .join('; ');
}
