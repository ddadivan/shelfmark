import { linkHost, ownImageUrl, safeHref, siteLetter } from './link-view';

describe('link view helpers', () => {
  it('allows only http(s) hrefs', () => {
    expect(safeHref('https://example.com/a')).toBe('https://example.com/a');
    expect(safeHref('http://example.com')).toBe('http://example.com');
    expect(safeHref('javascript:alert(1)')).toBeUndefined();
    expect(safeHref('data:text/html,hi')).toBeUndefined();
    expect(safeHref('not a url')).toBeUndefined();
  });

  it('shows the host without www and its capital letter', () => {
    expect(linkHost('https://www.example.com/a')).toBe('example.com');
    expect(siteLetter('https://www.example.com/a')).toBe('E');
  });

  it('binds only image paths of our own API', () => {
    const own = '/api/links/0197a1b2/image?v=abcdef0123456789';
    expect(ownImageUrl(own)).toBe(own);
    expect(ownImageUrl(null)).toBeUndefined();
    expect(ownImageUrl('https://evil.test/a.png')).toBeUndefined();
    expect(ownImageUrl('//evil.test/a.png')).toBeUndefined();
    expect(ownImageUrl('data:image/png;base64,AAAA')).toBeUndefined();
  });
});
