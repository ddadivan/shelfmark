import { describe, expect, it } from 'vitest';
import { toVideoEmbedUrl } from './to-video-embed-url';

const EMBED = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

describe('toVideoEmbedUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'http://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ',
  ])('turns %s into the nocookie player', (url) => {
    expect(toVideoEmbedUrl(url)).toBe(EMBED);
  });

  it.each([
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ%22onload',
    'https://www.youtube.com/',
    'https://www.youtube.com/channel/abc',
    'https://youtu.be/',
    'https://evil.example/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'javascript:alert(1)//youtu.be/dQw4w9WgXcQ',
    'ftp://youtu.be/dQw4w9WgXcQ',
    'not a url',
  ])('returns null for %s', (url) => {
    expect(toVideoEmbedUrl(url)).toBeNull();
  });
});
