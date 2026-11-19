import { deriveLinkKind } from './derive-link-kind';

describe('deriveLinkKind', () => {
  it('reads og:type first', () => {
    expect(deriveLinkKind('https://example.com/a', { ogType: 'video.other' })).toBe('video');
    expect(deriveLinkKind('https://example.com/a', { ogType: 'VIDEO' })).toBe('video');
    expect(deriveLinkKind('https://example.com/a', { ogType: ' article ' })).toBe('article');
    expect(deriveLinkKind('https://example.com/a', { ogType: 'product' })).toBe('shopping');
    expect(deriveLinkKind('https://example.com/a', { ogType: 'product.item' })).toBe('shopping');
    expect(deriveLinkKind('https://example.com/a', { ogType: 'og:product' })).toBe('shopping');
  });

  it('lets og:type win over the host', () => {
    expect(deriveLinkKind('https://www.amazon.de/blog', { ogType: 'article' })).toBe('article');
  });

  it('falls back to known video hosts and their subdomains', () => {
    expect(deriveLinkKind('https://youtu.be/abc')).toBe('video');
    expect(deriveLinkKind('https://m.youtube.com/watch?v=1', { ogType: 'website' })).toBe('video');
    expect(deriveLinkKind('https://VIMEO.com/1', { ogType: null })).toBe('video');
  });

  it('falls back to known shops', () => {
    expect(deriveLinkKind('https://www.etsy.com/listing/1')).toBe('shopping');
  });

  it('does not match a host that only ends with the same letters', () => {
    expect(deriveLinkKind('https://notyoutube.com/x')).toBe('other');
  });

  it('is other for anything else, also for a broken URL', () => {
    expect(deriveLinkKind('https://example.com', { ogType: 'website' })).toBe('other');
    expect(deriveLinkKind('not a url')).toBe('other');
  });
});

describe('deriveLinkKind with the kinds of #537', () => {
  const kind = (url: string, signals?: Parameters<typeof deriveLinkKind>[1]) =>
    deriveLinkKind(url, signals);

  it('makes a PDF a document, by response type or by path', () => {
    expect(kind('https://example.com/r', { contentType: 'application/pdf' })).toBe('document');
    expect(kind('https://example.com/r', { contentType: ' Application/X-PDF ' })).toBe('document');
    expect(kind('https://example.com/files/Report.PDF?dl=1')).toBe('document');
    expect(kind('https://github.com/a/b/raw/main/paper.pdf')).toBe('document');
    expect(kind('https://example.com/pdf-tools')).toBe('other');
  });

  it.each([
    ['https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk', 'podcast'],
    ['https://open.spotify.com/show/2MAi0BvDc6GTFvKFPXnkCL', 'podcast'],
    ['https://open.spotify.com/intl-de/episode/abc', 'podcast'],
    ['https://podcasts.apple.com/us/podcast/the-daily/id1200361736', 'podcast'],
    ['https://docs.google.com/document/d/1abc/edit', 'document'],
    ['https://docs.google.com/presentation/d/1abc/edit', 'document'],
    ['https://docs.google.com/spreadsheets/d/1abc/edit', 'document'],
    ['https://www.slideshare.net/someone/deck', 'document'],
    ['https://speakerdeck.com/someone/talk', 'document'],
    ['https://github.com/angular/angular', 'code'],
    ['https://gist.github.com/someone/123', 'code'],
    ['https://gitlab.com/group/project', 'code'],
    ['https://www.npmjs.com/package/zod', 'code'],
    ['https://bitbucket.org/team/repo', 'code'],
    ['https://pypi.org/project/requests/', 'code'],
    ['https://apps.apple.com/us/app/things-3/id904237743', 'app'],
    ['https://play.google.com/store/apps/details?id=com.example', 'app'],
    ['https://chromewebstore.google.com/detail/abc/def', 'app'],
    ['https://chrome.google.com/webstore/detail/abc', 'app'],
    ['https://x.com/someone/status/1790000000000000000', 'post'],
    ['https://twitter.com/someone/status/123', 'post'],
    ['https://mobile.twitter.com/someone/statuses/123', 'post'],
    ['https://www.threads.net/@someone/post/C1abc', 'post'],
    ['https://www.linkedin.com/posts/someone_topic-activity-1', 'post'],
    ['https://www.linkedin.com/feed/update/urn:li:activity:1/', 'post'],
    ['https://www.reddit.com/r/angular/comments/abc/title/', 'post'],
    ['https://old.reddit.com/r/angular/comments/abc/', 'post'],
    ['https://bsky.app/profile/someone.bsky.social/post/3kabc', 'post'],
  ])('reads %s as %s', (url, expected) => {
    expect(kind(url)).toBe(expected);
  });

  it.each([
    'https://open.spotify.com/track/abc',
    'https://open.spotify.com/album/abc',
    'https://docs.google.com/forms/d/abc',
    'https://play.google.com/store/movies/details/x',
    'https://x.com/someone',
    'https://twitter.com/home',
    'https://www.threads.net/@someone',
    'https://www.linkedin.com/in/someone',
    'https://www.reddit.com/r/angular/',
    'https://bsky.app/profile/someone.bsky.social',
    'https://notgithub.com/a/b',
  ])('keeps %s out of the certain rules', (url) => {
    expect(kind(url)).toBe('other');
  });

  it('lets a certain URL rule win over og:type', () => {
    expect(kind('https://www.linkedin.com/posts/a-1', { ogType: 'article' })).toBe('post');
    expect(kind('https://github.com/a/b', { ogType: 'object' })).toBe('code');
    expect(kind('https://apps.apple.com/app/id1', { ogType: 'product' })).toBe('app');
  });

  it('reads a schema.org Recipe before og:type, under any prefix', () => {
    expect(kind('https://example.com/r', { schemaTypes: ['Recipe'], ogType: 'article' })).toBe(
      'recipe',
    );
    expect(kind('https://example.com/r', { schemaTypes: ['schema:Recipe'] })).toBe('recipe');
    expect(kind('https://example.com/r', { schemaTypes: ['https://schema.org/Recipe'] })).toBe(
      'recipe',
    );
    expect(kind('https://example.com/r', { schemaTypes: ['RecipeCollection', 'WebPage'] })).toBe(
      'other',
    );
  });

  it('reads audio, podcast, app and recipe og:types, but not music', () => {
    expect(kind('https://example.com/a', { ogType: 'audio' })).toBe('podcast');
    expect(kind('https://example.com/a', { ogType: 'podcast.episode' })).toBe('podcast');
    expect(kind('https://example.com/a', { ogType: 'app' })).toBe('app');
    expect(kind('https://example.com/a', { ogType: 'software.application' })).toBe('app');
    expect(kind('https://example.com/a', { ogType: 'recipe' })).toBe('recipe');
    expect(kind('https://example.com/a', { ogType: 'music.song' })).toBe('other');
    expect(kind('https://example.com/a', { ogType: 'applesauce' })).toBe('other');
  });

  it('is deterministic', () => {
    const url = 'https://www.reddit.com/r/a/comments/b/';
    expect(kind(url)).toBe(kind(url));
  });
});
