import { canonicalYouTubeUrl, youTubeVideoId } from './youtube-video-id';

const ID = 'dQw4w9WgXcQ';

describe('youTubeVideoId', () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s&list=PL123`,
    `https://m.youtube.com/watch?feature=share&v=${ID}`,
    `http://www.youtube.com/watch/?v=${ID}`,
    `https://WWW.YouTube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc&t=10`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://youtube.com/shorts/${ID}/`,
    `https://m.youtube.com/shorts/${ID}?feature=share`,
    `http://www.youtube.com:8080/watch?v=${ID}`,
  ])('finds the id in %s', (url) => {
    expect(youTubeVideoId(url)).toBe(ID);
  });

  it.each([
    'not a url',
    `ftp://youtu.be/${ID}`,
    `https://user:pw@youtu.be/${ID}`,
    `https://www.youtube.com/watch?v=${ID}x`,
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=dQw4w9WgXc!',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/',
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}/extra`,
    'https://www.youtube.com/@channel',
    `https://music.youtube.com/watch?v=${ID}`,
    `https://youtube.com.evil.example/watch?v=${ID}`,
    `https://evil.example/watch?v=${ID}`,
    `https://youtu.be/${ID}/more`,
    'https://youtu.be/',
  ])('finds no video in %s', (url) => {
    expect(youTubeVideoId(url)).toBeNull();
  });

  it('builds the canonical watch URL', () => {
    expect(canonicalYouTubeUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });
});
