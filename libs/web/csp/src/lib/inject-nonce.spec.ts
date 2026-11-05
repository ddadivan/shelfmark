import { injectNonce } from './inject-nonce';

describe('injectNonce', () => {
  it('replaces every placeholder and leaves none behind', () => {
    const html =
      '<app-root ngCspNonce="CSP_NONCE_PLACEHOLDER"></app-root><i data-n="CSP_NONCE_PLACEHOLDER">';

    const result = injectNonce(html, 'n0nce==');

    expect(result).toBe('<app-root ngCspNonce="n0nce=="></app-root><i data-n="n0nce==">');
    expect(result).not.toContain('CSP_NONCE_PLACEHOLDER');
  });
});
