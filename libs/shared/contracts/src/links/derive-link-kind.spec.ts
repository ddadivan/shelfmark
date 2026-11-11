import { deriveLinkKind } from './derive-link-kind';

describe('deriveLinkKind', () => {
  it('reads og:type first', () => {
    expect(deriveLinkKind('https://example.com/a', 'video.other')).toBe('video');
    expect(deriveLinkKind('https://example.com/a', 'VIDEO')).toBe('video');
    expect(deriveLinkKind('https://example.com/a', ' article ')).toBe('article');
    expect(deriveLinkKind('https://example.com/a', 'product')).toBe('shopping');
    expect(deriveLinkKind('https://example.com/a', 'product.item')).toBe('shopping');
    expect(deriveLinkKind('https://example.com/a', 'og:product')).toBe('shopping');
  });

  it('lets og:type win over the host', () => {
    expect(deriveLinkKind('https://www.amazon.de/blog', 'article')).toBe('article');
  });

  it('falls back to known video hosts and their subdomains', () => {
    expect(deriveLinkKind('https://youtu.be/abc')).toBe('video');
    expect(deriveLinkKind('https://m.youtube.com/watch?v=1', 'website')).toBe('video');
    expect(deriveLinkKind('https://VIMEO.com/1', null)).toBe('video');
  });

  it('falls back to known shops', () => {
    expect(deriveLinkKind('https://www.etsy.com/listing/1')).toBe('shopping');
  });

  it('does not match a host that only ends with the same letters', () => {
    expect(deriveLinkKind('https://notyoutube.com/x')).toBe('other');
  });

  it('is other for anything else, also for a broken URL', () => {
    expect(deriveLinkKind('https://example.com', 'website')).toBe('other');
    expect(deriveLinkKind('not a url')).toBe('other');
  });
});
