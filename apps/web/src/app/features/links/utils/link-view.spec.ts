import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { hasPendingImages, linkHost, ownImageUrl, safeHref, siteLetter } from './link-view';

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
    const own = '/api/links/0197a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/image?v=abcdef0123456789';
    expect(ownImageUrl(own)).toBe(own);
    expect(ownImageUrl(null)).toBeUndefined();
    expect(ownImageUrl(`${own}&x=1`)).toBeUndefined();
    expect(ownImageUrl('/api/links/x/image?v=abcdef0123456789')).toBeUndefined();
    expect(
      ownImageUrl('/api/links/0123456789abcdef0123456789abcdef0123/image?v=pending'),
    ).toBeUndefined();
    expect(ownImageUrl('https://evil.test/a.png')).toBeUndefined();
    expect(ownImageUrl('//evil.test/a.png')).toBeUndefined();
    expect(ownImageUrl('data:image/png;base64,AAAA')).toBeUndefined();
  });

  it('accepts the image paths of a public collection keyed by its token', () => {
    const own =
      '/api/public/collections/sampleToken-sampleToke/links/0123456789abcdef0123456789abcdef0123/favicon?v=abcdef0123456789';
    expect(ownImageUrl(own)).toBe(own);
    expect(ownImageUrl(own.replace('sampleToken-sampleToke', 'short'))).toBeUndefined();
    expect(ownImageUrl(own.replace('/links/', '/x/'))).toBeUndefined();
    expect(ownImageUrl(own.replace('abcdef0123456789', 'pending'))).toBeUndefined();
  });

  it('detects the pending marker of either image path', () => {
    const base = { ...MOCK_LINKS[0], faviconUrl: null, imageUrl: null };
    expect(hasPendingImages(base)).toBe(false);
    expect(hasPendingImages({ ...base, imageUrl: '/api/links/x/image?v=pending' })).toBe(true);
    expect(hasPendingImages({ ...base, faviconUrl: '/api/links/x/favicon?v=pending' })).toBe(true);
    expect(hasPendingImages({ ...base, imageUrl: '/api/links/x/image?v=0123456789abcdef' })).toBe(
      false,
    );
  });
});
