import { buildCsp } from './build-csp';

const STATIC_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: https://*.googleusercontent.com https://avatars.githubusercontent.com; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'";

describe('buildCsp', () => {
  it('returns the documented static policy for null', () => {
    expect(buildCsp(null)).toBe(STATIC_POLICY);
  });

  it('adds the nonce to style-src only', () => {
    const csp = buildCsp('abc123==');

    expect(csp).toContain("style-src 'self' 'nonce-abc123=='");
    expect(csp.match(/nonce-/g)).toHaveLength(1);
    expect(csp).toContain("script-src 'self';");
  });

  it('never allows unsafe sources or a bare wildcard', () => {
    for (const csp of [buildCsp(null), buildCsp('abc123==')]) {
      expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
      expect(csp).not.toMatch(/\s\*(\s|;|$)/);
    }
  });

  it('allows every Google avatar host by subdomain wildcard and only the exact GitHub host', () => {
    const imgSrc = buildCsp(null)
      .split('; ')
      .find((directive) => directive.startsWith('img-src '));

    expect(imgSrc?.split(' ')).toEqual([
      'img-src',
      "'self'",
      'data:',
      'https://*.googleusercontent.com',
      'https://avatars.githubusercontent.com',
    ]);
  });
});
