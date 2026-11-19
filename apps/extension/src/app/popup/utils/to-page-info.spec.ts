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
      titleFromTab: true,
      host: 'example.com',
    });
  });

  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Never Gonna Give You Up - YouTube'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', '(12) Never Gonna Give You Up - YouTube'],
    ['https://youtu.be/dQw4w9WgXcQ', 'Never Gonna Give You Up — YouTube'],
  ])('keeps the video title of the YouTube tab %s', (url, title) => {
    expect(toPageInfo({ url, title })).toMatchObject({
      title: 'Never Gonna Give You Up',
      titleFromTab: true,
    });
  });

  it.each(['YouTube', '(3) YouTube', '  youtube  '])(
    'leaves the generic YouTube tab title %j to the server',
    (title) => {
      expect(toPageInfo({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title })).toEqual({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'youtube.com',
        titleFromTab: false,
        host: 'youtube.com',
      });
    },
  );

  it('keeps " - YouTube" on other sites', () => {
    expect(toPageInfo({ url: 'https://example.com/', title: 'Clip - YouTube' })?.title).toBe(
      'Clip - YouTube',
    );
  });

  it('falls back to the host when the title is blank, and sends none', () => {
    expect(toPageInfo({ url: 'http://blog.example.com/', title: '   ' })).toMatchObject({
      title: 'blog.example.com',
      titleFromTab: false,
    });
  });
});
