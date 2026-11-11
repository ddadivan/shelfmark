import { LINK_LIMIT } from '@shelfmark/contracts';
import { PASTE_LIMIT } from './models/paste-limits.const';
import { parsePastedLinks } from './parse-pasted-links';

describe('parsePastedLinks', () => {
  it('reads the mockup paste: one link per line, bare domains get https, a note is skipped', () => {
    const paste = [
      'youtube.com/watch?v=signals-deep-dive',
      'https://angular.dev/guide/forms/signals',
      'dev.to/ngrx/signalstore-testing',
      'https://youtube.com/watch?v=ng22-signal-forms',
      'remember to check the RFC',
    ].join('\n');

    expect(parsePastedLinks(paste)).toEqual({
      links: [
        'https://youtube.com/watch?v=signals-deep-dive',
        'https://angular.dev/guide/forms/signals',
        'https://dev.to/ngrx/signalstore-testing',
        'https://youtube.com/watch?v=ng22-signal-forms',
      ],
      skipped: ['remember to check the RFC'],
      overflow: 0,
      found: 4,
    });
  });

  it('finds links inside a message and drops sentence punctuation', () => {
    const { links, skipped } = parsePastedLinks(
      'Hey, look at https://angular.dev/overview, and also (https://ngrx.io/guide/signals). Thanks!',
    );
    expect(links).toEqual(['https://angular.dev/overview', 'https://ngrx.io/guide/signals']);
    expect(skipped).toEqual([]);
  });

  it.each([
    ['a period', 'See https://a.test/page.', 'https://a.test/page'],
    ['a question mark', 'Seen https://a.test/x?', 'https://a.test/x'],
    ['quotes', '"https://a.test/q"', 'https://a.test/q'],
    ['curly quotes', '“https://a.test/q”', 'https://a.test/q'],
    ['angle brackets', '<https://a.test/x>', 'https://a.test/x'],
    ['a markdown link', '[docs](https://a.test/docs)', 'https://a.test/docs'],
    ['a list bullet', '- https://a.test/item', 'https://a.test/item'],
    ['a numbered list', '1. dev.to/a/b', 'https://dev.to/a/b'],
    ['bold markdown', '**https://a.test/b**', 'https://a.test/b'],
  ])('handles %s', (_name, text, link) => {
    expect(parsePastedLinks(text).links).toEqual([link]);
  });

  it('keeps balanced parentheses that belong to the path', () => {
    expect(
      parsePastedLinks('Read https://en.wikipedia.org/wiki/Angular_(web_framework) first').links,
    ).toEqual(['https://en.wikipedia.org/wiki/Angular_(web_framework)']);
  });

  it('keeps query strings, fragments, ports and http', () => {
    expect(
      parsePastedLinks('http://a.test:8080/p?q=1&r=2#top https://b.test/#/route').links,
    ).toEqual(['http://a.test:8080/p?q=1&r=2#top', 'https://b.test/#/route']);
  });

  it('accepts www hosts without a path and bare domains with one', () => {
    expect(parsePastedLinks('www.example.com and example.org/page').links).toEqual([
      'https://www.example.com',
      'https://example.org/page',
    ]);
  });

  it.each([
    ['a bare domain without a path', 'example.com'],
    ['an abbreviation', 'e.g. this'],
    ['a version number', 'v1.2.3 is out'],
    ['a file name', 'notes.txt'],
    ['an email address', 'mail me at dev@example.com'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a data: URL', 'data:text/html,hi'],
    ['an ftp URL', 'ftp://files.test/a'],
    ['a URL with credentials', 'https://user:pw@a.test/'],
    ['plain words', 'remember to check the RFC'],
  ])('does not take %s for a link', (_name, text) => {
    const parsed = parsePastedLinks(text);
    expect(parsed.links).toEqual([]);
    expect(parsed.skipped).toEqual([text]);
  });

  it('collapses the same link written differently (case of host, utm, fragment, trailing slash)', () => {
    const { links, found } = parsePastedLinks(
      [
        'https://Angular.dev/guide/',
        'https://angular.dev/guide?utm_source=x',
        'angular.dev/guide#intro',
        'https://angular.dev/guide',
      ].join('\n'),
    );
    expect(links).toEqual(['https://Angular.dev/guide/']);
    expect(found).toBe(1);
  });

  it('keeps distinct links that only share a host', () => {
    expect(parsePastedLinks('https://a.test/1 https://a.test/2').links).toHaveLength(2);
  });

  it('handles Windows and old Mac line breaks and blank lines', () => {
    const parsed = parsePastedLinks('https://a.test/1\r\n\r\nnote\rhttps://a.test/2\n  \n');
    expect(parsed.links).toEqual(['https://a.test/1', 'https://a.test/2']);
    expect(parsed.skipped).toEqual(['note']);
  });

  it('skips a line only when it has no link at all', () => {
    const parsed = parsePastedLinks('intro text https://a.test/x more text\nno link here');
    expect(parsed.skipped).toEqual(['no link here']);
  });

  it('shortens long skipped lines and lists at most 20 of them', () => {
    const long = 'word '.repeat(40);
    const lines = Array.from({ length: 30 }, (_, i) => `${long}${i}`).join('\n');
    const { skipped } = parsePastedLinks(lines);
    expect(skipped).toHaveLength(PASTE_LIMIT.SkippedMax);
    expect([...skipped[0]]).toHaveLength(PASTE_LIMIT.SkippedLength);
    expect(skipped[0].endsWith('…')).toBe(true);
  });

  it('keeps 100 links and counts the rest as overflow', () => {
    const paste = Array.from({ length: 130 }, (_, i) => `https://many.test/${i}`).join('\n');
    const parsed = parsePastedLinks(paste);
    expect(parsed.links).toHaveLength(LINK_LIMIT.BatchMax);
    expect(parsed.links[99]).toBe('https://many.test/99');
    expect(parsed.overflow).toBe(30);
    expect(parsed.found).toBe(130);
  });

  it('does not count duplicates as overflow', () => {
    const paste = Array.from({ length: 150 }, (_, i) => `https://many.test/${i % 100}`).join('\n');
    expect(parsePastedLinks(paste).overflow).toBe(0);
  });

  it('drops a link longer than the URL limit', () => {
    const parsed = parsePastedLinks(`https://a.test/${'x'.repeat(LINK_LIMIT.UrlMax)}`);
    expect(parsed.links).toEqual([]);
  });

  it('returns nothing for empty text', () => {
    expect(parsePastedLinks('')).toEqual({ links: [], skipped: [], overflow: 0, found: 0 });
  });

  it('ignores other schemes: javascript, data, ftp, mailto', () => {
    const parsed = parsePastedLinks(
      [
        'javascript:alert(1)',
        'data:text/html,<b>x</b>',
        'ftp://files.example.org/a',
        'mailto:me@example.org',
      ].join('\n'),
    );
    expect(parsed.links).toEqual([]);
    expect(parsed.skipped).toHaveLength(4);
  });

  it('does not take e-mail addresses, version numbers or file names for links', () => {
    const parsed = parsePastedLinks('write to me@example.org, see v1.2 or readme.md, e.g. later');
    expect(parsed.links).toEqual([]);
    expect(parsed.skipped).toHaveLength(1);
  });

  it('reads links out of Markdown, angle brackets and quotes', () => {
    expect(
      parsePastedLinks(
        '[docs](https://angular.dev/guide) <https://ngrx.io/guide> "https://nx.dev/docs"',
      ).links,
    ).toEqual(['https://angular.dev/guide', 'https://ngrx.io/guide', 'https://nx.dev/docs']);
  });

  it('reads bulleted and numbered lists', () => {
    expect(
      parsePastedLinks(
        '- dev.to/a/b\n* https://example.org/c\n1. www.example.com\n2) example.net/d',
      ).links,
    ).toEqual([
      'https://dev.to/a/b',
      'https://example.org/c',
      'https://www.example.com',
      'https://example.net/d',
    ]);
  });

  it('drops links with a user name or password', () => {
    expect(parsePastedLinks('https://user:secret@example.org/a').links).toEqual([]);
  });

  it('takes an upper-case scheme as it is', () => {
    expect(parsePastedLinks('HTTPS://Example.org/Path').links).toEqual([
      'HTTPS://Example.org/Path',
    ]);
  });

  it('drops a trailing ellipsis and question mark of the sentence', () => {
    expect(
      parsePastedLinks('have you read https://example.org/a? and example.org/b...').links,
    ).toEqual(['https://example.org/a', 'https://example.org/b']);
  });

  it('keeps the first spelling of a link pasted twice and counts it once', () => {
    const parsed = parsePastedLinks('example.org/a\nhttps://example.org/a\nhttp://example.org/a');
    expect(parsed.links[0]).toBe('https://example.org/a');
    expect(parsed.found).toBe(parsed.links.length);
  });

  it('reads only the start of a huge paste', () => {
    const parsed = parsePastedLinks(`${' '.repeat(600_000)}https://late.example/a`);
    expect(parsed.links).toEqual([]);
  });

  it('finds several links on one line separated by commas or spaces', () => {
    expect(parsePastedLinks('https://a.test/1,https://a.test/2 dev.to/x/y').links).toEqual([
      'https://a.test/1',
      'https://a.test/2',
      'https://dev.to/x/y',
    ]);
  });
});
