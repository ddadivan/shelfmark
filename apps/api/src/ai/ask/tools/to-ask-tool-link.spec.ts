import type { AskLinkRow } from '../../models/ask-link-row.type';
import { askSite, toAskToolLink } from './to-ask-tool-link';

const ROW: AskLinkRow = {
  id: '0193a000-0000-7000-8000-000000000001',
  url: 'https://www.example.com/articles/signals?utm_source=x&token=secret#part',
  title: 'Signals in depth',
  folderId: 'f1',
  note: 'my private note',
  summary: 'A long summary. '.repeat(40),
  kind: 'article',
  isFavorite: true,
  createdAt: new Date('2026-10-03T22:30:00Z'),
  lastOpenedAt: new Date('2026-11-01T08:00:00Z'),
  tags: [
    { tag: { name: 'zeta' } },
    { tag: { name: 'angular' } },
    ...Array.from({ length: 12 }, (_, i) => ({ tag: { name: `t${i}` } })),
  ],
};
const PATHS = new Map([['f1', 'Work / Angular']]);

describe('toAskToolLink', () => {
  it('pins the allow-listed keys of a list item: no id, URL without query, no note', () => {
    const link = toAskToolLink(ROW, 4, PATHS, { includeNotes: true, match: 'words' });
    expect(Object.keys(link).sort()).toEqual(
      [
        'favorite',
        'folder',
        'kind',
        'match',
        'ref',
        'savedOn',
        'site',
        'summary',
        'tags',
        'title',
      ].sort(),
    );
    expect(link).toMatchObject({
      ref: 4,
      site: 'example.com/articles/signals',
      folder: 'Work / Angular',
      kind: 'article',
      favorite: true,
      savedOn: '2026-10-03',
    });
    expect(JSON.stringify(link)).not.toContain(ROW.id);
    expect(JSON.stringify(link)).not.toContain('secret');
    expect(JSON.stringify(link)).not.toContain('private');
    expect(link.tags).toHaveLength(10);
    expect(link.tags[0]).toBe('angular');
    expect(Array.from(link.summary ?? '').length).toBeLessThanOrEqual(200);
  });

  it('adds the note only with the switch, and the last open day, in detail', () => {
    const off = toAskToolLink(ROW, 1, PATHS, { includeNotes: false, detail: true });
    expect(off.note).toBeNull();
    expect(off.lastOpenedOn).toBe('2026-11-01');
    expect(Array.from(off.summary ?? '').length).toBeLessThanOrEqual(300);
    const on = toAskToolLink(ROW, 1, PATHS, { includeNotes: true, detail: true });
    expect(on.note).toBe('my private note');
  });

  it('shows Unsorted and unknown folders as null', () => {
    expect(
      toAskToolLink({ ...ROW, folderId: null }, 1, PATHS, { includeNotes: false }).folder,
    ).toBeNull();
    expect(
      toAskToolLink({ ...ROW, folderId: 'gone' }, 1, PATHS, { includeNotes: false }).folder,
    ).toBeNull();
  });

  it('cuts long titles and keeps sites without credentials', () => {
    expect(
      Array.from(
        toAskToolLink({ ...ROW, title: 'x'.repeat(300) }, 1, PATHS, { includeNotes: false }).title,
      ),
    ).toHaveLength(200);
    expect(askSite('https://user:pw@example.org/')).toBe('example.org');
    expect(askSite('not a url')).toBe('');
  });
});
