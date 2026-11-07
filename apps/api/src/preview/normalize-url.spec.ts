import { normalizeUrl } from './normalize-url';

describe('normalizeUrl', () => {
  it.each([
    ['https://Example.COM/Path', 'https://example.com/Path'],
    ['https://example.com/', 'https://example.com'],
    ['https://example.com/a/b/', 'https://example.com/a/b'],
    ['https://example.com/a#section', 'https://example.com/a'],
    ['https://example.com/a?utm_source=x&id=7', 'https://example.com/a?id=7'],
    ['https://example.com/a?UTM_Medium=x&utm_campaign=y', 'https://example.com/a'],
    ['https://example.com/a?%75tm_source=x&q=1', 'https://example.com/a?q=1'],
    ['https://example.com/a?q=a%20b&utm_term=z', 'https://example.com/a?q=a%20b'],
    ['https://example.com:443/a', 'https://example.com/a'],
    ['http://example.com:8080/a/', 'http://example.com:8080/a'],
    ['https://example.com/a?&&b=1', 'https://example.com/a?b=1'],
    ['  https://example.com/a  ', 'https://example.com/a'],
    ['https://example.com/a?utm_x=1#frag', 'https://example.com/a'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it('maps equivalent URLs to the same value', () => {
    expect(normalizeUrl('https://EXAMPLE.com/x/?utm_source=a#top')).toBe(
      normalizeUrl('https://example.com/x'),
    );
  });

  it('returns input that is not a URL trimmed', () => {
    expect(normalizeUrl('  not a url ')).toBe('not a url');
  });

  it('keeps a malformed percent-encoded param name', () => {
    expect(normalizeUrl('https://example.com/a?%E0%A4%A=1')).toBe(
      'https://example.com/a?%E0%A4%A=1',
    );
  });
});
