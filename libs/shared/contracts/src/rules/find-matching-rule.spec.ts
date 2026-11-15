import { findMatchingRule, hostMatchesDomain } from './find-matching-rule';

const youtube = { domain: 'youtube.com', folderId: 'videos', tags: ['video'] };
const music = { domain: 'music.youtube.com', folderId: 'music', tags: [] };
const books = { domain: 'xn--bcher-kva.de', folderId: null, tags: ['books'] };

describe('hostMatchesDomain', () => {
  it('matches the domain and its subdomains, never a lookalike', () => {
    expect(hostMatchesDomain('youtube.com', 'youtube.com')).toBe(true);
    expect(hostMatchesDomain('m.youtube.com', 'youtube.com')).toBe(true);
    expect(hostMatchesDomain('notyoutube.com', 'youtube.com')).toBe(false);
    expect(hostMatchesDomain('youtube.com.evil.io', 'youtube.com')).toBe(false);
  });
});

describe('findMatchingRule', () => {
  it('finds the rule of the host, www and case ignored', () => {
    expect(findMatchingRule([youtube], 'https://WWW.YouTube.com/watch?v=1')).toBe(youtube);
    expect(findMatchingRule([youtube], 'https://m.youtube.com/x')).toBe(youtube);
  });

  it('prefers the most specific domain', () => {
    expect(findMatchingRule([youtube, music], 'https://music.youtube.com/a')).toBe(music);
    expect(findMatchingRule([music, youtube], 'https://music.youtube.com/a')).toBe(music);
    expect(findMatchingRule([music, youtube], 'https://youtube.com/a')).toBe(youtube);
  });

  it('matches international domains written either way', () => {
    expect(findMatchingRule([books], 'https://bücher.de/a')).toBe(books);
    expect(findMatchingRule([books], 'https://xn--bcher-kva.de/a')).toBe(books);
  });

  it('returns null without a match or an http(s) host', () => {
    expect(findMatchingRule([youtube], 'https://vimeo.com/1')).toBeNull();
    expect(findMatchingRule([youtube], 'not a url')).toBeNull();
    expect(findMatchingRule([], 'https://youtube.com')).toBeNull();
  });
});
