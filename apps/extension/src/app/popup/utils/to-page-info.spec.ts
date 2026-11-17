import { toPageInfo } from './to-page-info';

describe('toPageInfo', () => {
  it('returns null when there is no tab', () => {
    expect(toPageInfo(null)).toBeNull();
  });

  it.each(['chrome://extensions', 'file:///tmp/a.html', 'about:blank', 'javascript:alert(1)'])(
    'returns null for the non-http page %s',
    (url) => {
      expect(toPageInfo({ url, title: 'x' })).toBeNull();
    },
  );

  it('returns the url, trimmed title and host without www', () => {
    expect(toPageInfo({ url: 'https://www.example.com/a?b=1', title: '  Hello  ' })).toEqual({
      url: 'https://www.example.com/a?b=1',
      title: 'Hello',
      host: 'example.com',
    });
  });

  it('falls back to the host when the title is blank', () => {
    expect(toPageInfo({ url: 'http://blog.example.com/', title: '   ' })?.title).toBe(
      'blog.example.com',
    );
  });
});
