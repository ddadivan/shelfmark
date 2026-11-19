import { IMPORT_LIMIT, LINK_LIMIT } from '@shelfmark/contracts';
import { readRepoFile } from '../../../../testing/read-repo-file';
import { ImportParseError } from './import-parse-error';
import { parseNetscapeBookmarks } from './parse-netscape-bookmarks';

const FIXTURES = 'apps/web/src/app/features/import/utils/fixtures';
const NOW = Date.UTC(2026, 10, 19);
const UNTITLED = 'Untitled folder';

function parseFixture(name: string) {
  return parseNetscapeBookmarks(readRepoFile(`${FIXTURES}/${name}`), UNTITLED, NOW);
}

function file(body: string): string {
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n${body}\n</DL><p>`;
}

describe('parseNetscapeBookmarks', () => {
  it('reads a Chrome export: nested folders, dates, only web links, empty folders left out', () => {
    const parsed = parseFixture('chrome-bookmarks.html');

    expect(parsed.folders).toEqual([
      { key: 'f1', parentKey: null, name: 'Bookmarks bar' },
      { key: 'f2', parentKey: 'f1', name: 'Recipes' },
      { key: 'f3', parentKey: 'f2', name: 'Baking' },
      { key: 'f4', parentKey: null, name: 'Other bookmarks' },
      { key: 'f6', parentKey: null, name: 'Mobile bookmarks' },
    ]);
    expect(parsed.links.map((link) => [link.url, link.title, link.folderKey])).toEqual([
      ['https://angular.dev/', 'Angular', 'f1'],
      [
        'https://developer.mozilla.org/en-US/docs/Web/API/DOMParser',
        'DOMParser - Web APIs | MDN',
        'f1',
      ],
      ['https://www.seriouseats.com/the-best-ramen', 'The Best Ramen & Broth', 'f2'],
      ['https://www.kingarthurbaking.com/recipes/sourdough', 'Sourdough bread', 'f3'],
      ['https://angular.dev', 'Angular again', 'f4'],
      ['https://news.ycombinator.com/', 'Hacker News', 'f4'],
      ['https://example.com/no-title', undefined, 'f4'],
      ['https://www.bbc.com/news', 'BBC News', 'f6'],
    ]);
    // `javascript:` and `chrome:` entries.
    expect(parsed.notWeb).toBe(2);
    expect(parsed.links[0]).toMatchObject({
      tags: [],
      addedAt: new Date(1_700_000_001_000).toISOString(),
    });
  });

  it('never keeps markup from the file: titles are text content', () => {
    const parsed = parseFixture('chrome-bookmarks.html');

    for (const link of parsed.links) {
      expect(link.title ?? '').not.toMatch(/[<>]/);
    }
  });

  it('reads a Firefox export: tags, notes, unnamed folders and links at the top level', () => {
    const parsed = parseFixture('firefox-bookmarks.html');

    expect(parsed.folders).toEqual([
      { key: 'f1', parentKey: null, name: 'Mozilla Firefox' },
      { key: 'f2', parentKey: null, name: 'Bookmarks Toolbar' },
      { key: 'f3', parentKey: 'f2', name: UNTITLED },
    ]);
    const verge = parsed.links.find((link) => link.url === 'https://www.theverge.com/tech');
    expect(verge).toEqual({
      url: 'https://www.theverge.com/tech',
      title: 'The Verge',
      folderKey: null,
      tags: ['news', 'tech', 'long-read'],
      note: 'Daily tech news, worth a look on Fridays.',
      addedAt: new Date(1_700_000_100_000).toISOString(),
    });
    // ADD_DATE in milliseconds is understood too.
    expect(parsed.links.find((link) => link.folderKey === 'f3')?.addedAt).toBe(
      new Date(1_700_000_600_000).toISOString(),
    );
    // The `place:` query.
    expect(parsed.notWeb).toBe(1);
    expect(parsed.links).toHaveLength(5);
  });

  it('reads a Safari export without dates and with folders outside a list', () => {
    const parsed = parseFixture('safari-bookmarks.html');

    expect(parsed.folders.map((folder) => folder.name)).toEqual(['Favourites', 'Reading List']);
    expect(parsed.links.map((link) => link.url)).toEqual([
      'https://www.apple.com/',
      'https://www.wikipedia.org/',
      'https://example.com/article',
      'https://www.icloud.com/',
    ]);
    expect(parsed.links[2]).toMatchObject({ note: 'Saved from the share sheet', folderKey: 'f2' });
    expect(parsed.links.every((link) => link.addedAt === undefined)).toBe(true);
  });

  it('refuses a file that is not a bookmark file', () => {
    expect(() => parseNetscapeBookmarks('{"links": []}', UNTITLED, NOW)).toThrow(ImportParseError);
    expect(() => parseNetscapeBookmarks('<p>Hello</p>', UNTITLED, NOW)).toThrow(ImportParseError);
  });

  it('reads an empty export as no links', () => {
    expect(parseNetscapeBookmarks(file(''), UNTITLED, NOW)).toEqual({
      folders: [],
      links: [],
      notWeb: 0,
    });
  });

  it('puts folders deeper than the limit into their deepest kept ancestor', () => {
    const depth = IMPORT_LIMIT.DepthMax + 2;
    let body = '<DT><A HREF="https://example.com/deepest">Deepest</A>';
    for (let level = depth; level >= 1; level -= 1) {
      body = `<DT><H3>Level ${level}</H3>\n<DL><p>\n${body}\n</DL><p>`;
    }

    const parsed = parseNetscapeBookmarks(file(body), UNTITLED, NOW);

    expect(parsed.folders).toHaveLength(IMPORT_LIMIT.DepthMax);
    expect(parsed.links[0].folderKey).toBe(`f${IMPORT_LIMIT.DepthMax}`);
  });

  it('drops dates in the future or before 1990 and cleans control characters', () => {
    const future = Math.floor(NOW / 1000) + 3600;
    const parsed = parseNetscapeBookmarks(
      file(
        `<DT><A HREF="https://a.example/" ADD_DATE="${future}">A&#9;tab</A>\n` +
          '<DT><A HREF="https://b.example/" ADD_DATE="315532800">B</A>\n' +
          '<DT><A HREF="https://c.example/" ADD_DATE="soon">C</A>',
      ),
      UNTITLED,
      NOW,
    );

    expect(parsed.links.map((link) => link.addedAt)).toEqual([undefined, undefined, undefined]);
    expect(parsed.links[0].title).toBe('A tab');
  });

  it('cuts long titles, notes and tag lists to the link limits and skips long URLs', () => {
    const longTitle = 'x'.repeat(LINK_LIMIT.TitleMax + 50);
    const tags = Array.from({ length: LINK_LIMIT.TagsMax + 5 }, (_, i) => `t${i}`).join(',');
    const longUrl = `https://example.com/${'p'.repeat(LINK_LIMIT.UrlMax)}`;
    const parsed = parseNetscapeBookmarks(
      file(
        `<DT><A HREF="https://example.com/" TAGS="${tags},${'y'.repeat(60)}">${longTitle}</A>\n` +
          `<DD>${'n'.repeat(LINK_LIMIT.NoteMax + 10)}\n` +
          `<DT><A HREF="${longUrl}">Too long</A>\n` +
          '<DT><A HREF="mailto:someone@example.com">Mail</A>\n' +
          '<DT><A>No address</A>',
      ),
      UNTITLED,
      NOW,
    );

    expect(parsed.links).toHaveLength(1);
    expect(parsed.links[0].title).toHaveLength(LINK_LIMIT.TitleMax);
    expect(parsed.links[0].note).toHaveLength(LINK_LIMIT.NoteMax);
    expect(parsed.links[0].tags).toHaveLength(LINK_LIMIT.TagsMax);
    expect(parsed.notWeb).toBe(3);
  });

  it('reads a folder description that holds its list', () => {
    const parsed = parseNetscapeBookmarks(
      file(
        '<DT><H3>Described</H3>\n<DD>About this folder\n<DL><p>\n<DT><A HREF="https://d.example/">D</A>\n</DL><p>',
      ),
      UNTITLED,
      NOW,
    );

    expect(parsed.folders).toEqual([{ key: 'f1', parentKey: null, name: 'Described' }]);
    expect(parsed.links).toEqual([
      { url: 'https://d.example/', title: 'D', folderKey: 'f1', tags: [] },
    ]);
  });

  it('counts links the API would reject as not web: credentials, control characters, too long', () => {
    const long = `https://example.com/${'a'.repeat(LINK_LIMIT.UrlMax)}`;
    const parsed = parseNetscapeBookmarks(
      file(
        [
          '<DT><A HREF="https://user:pw@example.com/">Credentials</A>',
          '<DT><A HREF="https://exa&#9;mple.com/a">Tab</A>',
          '<DT><A HREF="https://example.com/a&#10;b">Newline</A>',
          `<DT><A HREF="${long}">Long</A>`,
          '<DT><A HREF="  https://example.com/ok  ">Fine</A>',
        ].join('\n'),
      ),
      UNTITLED,
      NOW,
    );

    expect(parsed.links.map((link) => link.url)).toEqual(['https://example.com/ok']);
    expect(parsed.notWeb).toBe(4);
  });
});
