import { LINK_LIMIT } from '@shelfmark/contracts';
import { isStorableUrl } from './storable-url';

describe('isStorableUrl', () => {
  it.each(['https://example.com', 'http://example.com/a?b=1#c', 'https://example.com:8080/x'])(
    'accepts %s',
    (url) => {
      expect(isStorableUrl(url)).toBe(true);
    },
  );

  it.each([
    'https://user:pw@example.com/',
    'https://user@example.com/',
    'https://exa\tmple.com/',
    'https://example.com/a\nb',
    'https://example.com/a\u0000b',
    'https://example.com/a\u007fb',
    'javascript:alert(1)',
    'ftp://example.com/',
    'not a url',
    '',
  ])('rejects %j', (url) => {
    expect(isStorableUrl(url)).toBe(false);
  });

  it('rejects a URL over the length limit and accepts one at it', () => {
    const base = 'https://example.com/';
    expect(isStorableUrl(base + 'a'.repeat(LINK_LIMIT.UrlMax - base.length))).toBe(true);
    expect(isStorableUrl(base + 'a'.repeat(LINK_LIMIT.UrlMax - base.length + 1))).toBe(false);
  });
});
