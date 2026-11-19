import { parseYouTubeOembed } from './parse-youtube-oembed';
import { youTubeExcerpt, youTubePreview } from './youtube-preview';
import { remainingLimits } from './remaining-limits';

const GOOD = {
  title: '  Never   gonna give you up ',
  author_name: 'Rick Astley',
  thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  type: 'video',
  html: '<iframe src="x"></iframe>',
};

describe('parseYouTubeOembed', () => {
  it('keeps title, channel and thumbnail as plain, capped values', () => {
    expect(parseYouTubeOembed(GOOD)).toEqual({
      title: 'Never gonna give you up',
      authorName: 'Rick Astley',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
  });

  it.each([null, undefined, 'text', 7, [], [GOOD], {}, { title: 5 }, { title: '   ' }])(
    'gives up on %j (not an object or no usable title)',
    (raw) => {
      expect(parseYouTubeOembed(raw)).toBeNull();
    },
  );

  it('strips markup and control characters and caps the lengths', () => {
    const parsed = parseYouTubeOembed({
      title: `<b>Bold</b>\u0000 ${'t'.repeat(400)}`,
      author_name: `<script>x</script>${'a'.repeat(300)}`,
    });
    expect(parsed?.title.startsWith('Bold t')).toBe(true);
    expect(parsed?.title).not.toContain('<');
    expect(parsed?.title).not.toContain('\u0000');
    expect(Array.from(parsed?.title ?? '')).toHaveLength(300);
    expect(parsed?.authorName).not.toContain('<');
    expect(Array.from(parsed?.authorName ?? '')).toHaveLength(200);
  });

  it.each([
    7,
    '',
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    '/vi/relative.jpg',
    'https://user:pw@i.ytimg.com/x.jpg',
    `https://i.ytimg.com/${'x'.repeat(2048)}`,
  ])('drops the thumbnail %j and a missing or odd channel', (thumbnail) => {
    expect(parseYouTubeOembed({ title: 'T', author_name: 42, thumbnail_url: thumbnail })).toEqual({
      title: 'T',
      authorName: null,
      thumbnailUrl: null,
    });
  });
});

describe('youTubePreview and youTubeExcerpt', () => {
  const video = {
    id: 'dQw4w9WgXcQ',
    canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Never gonna',
    authorName: 'Rick Astley',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  };

  it('builds a video preview with the thumbnail as image source', () => {
    expect(youTubePreview(video)).toEqual({
      kind: 'video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Never gonna',
      description: 'Rick Astley',
      imageUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      faviconUrl: 'https://www.youtube.com/favicon.ico',
    });
  });

  it('writes the excerpt with or without the channel', () => {
    expect(youTubeExcerpt(video)).toBe('YouTube video: Never gonna by Rick Astley');
    expect(youTubeExcerpt({ ...video, authorName: null })).toBe('YouTube video: Never gonna');
  });
});

describe('remainingLimits', () => {
  it('lowers the total budget by the time used and keeps the other limits', () => {
    expect(remainingLimits({ totalTimeoutMs: 6000, maxRedirects: 3 }, 2500)).toEqual({
      totalTimeoutMs: 3500,
      maxRedirects: 3,
    });
    expect(remainingLimits({}, 1000)).toEqual({ totalTimeoutMs: 7000 });
    expect(remainingLimits({ totalTimeoutMs: 3000 }, -5)).toEqual({ totalTimeoutMs: 3000 });
  });

  it('answers null when nothing is left', () => {
    expect(remainingLimits({ totalTimeoutMs: 3000 }, 3000)).toBeNull();
    expect(remainingLimits({ totalTimeoutMs: 3000 }, 9000)).toBeNull();
  });
});
