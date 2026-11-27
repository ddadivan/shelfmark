import { LINK_LIMIT, searchTerms } from '@shelfmark/contracts';
import { describe, expect, it } from 'vitest';
import { buildLinkWhere } from './link-where';

const USER = '018f0000-0000-7000-8000-000000000001';
const FOLDER = '018f0000-0000-7000-8000-000000000002';

describe('searchTerms', () => {
  it('is empty without text', () => {
    expect(searchTerms(undefined)).toEqual([]);
    expect(searchTerms('   ')).toEqual([]);
  });

  it('splits on any whitespace', () => {
    expect(searchTerms('  angular \t signals\nrouter ')).toEqual(['angular', 'signals', 'router']);
  });

  it('keeps at most QueryTermsMax words', () => {
    const words = Array.from({ length: LINK_LIMIT.QueryTermsMax + 3 }, (_, i) => `w${i}`);
    expect(searchTerms(words.join(' '))).toEqual(words.slice(0, LINK_LIMIT.QueryTermsMax));
  });
});

describe('buildLinkWhere', () => {
  it('always filters by the user', () => {
    expect(buildLinkWhere(USER, {})).toEqual({ userId: USER, deletedAt: null, AND: [] });
  });

  it('filters by folder, unsorted and favorite', () => {
    expect(buildLinkWhere(USER, { folderId: FOLDER }).AND).toEqual([{ folderId: FOLDER }]);
    expect(buildLinkWhere(USER, { unsorted: true }).AND).toEqual([{ folderId: null }]);
    expect(buildLinkWhere(USER, { favorite: false }).AND).toEqual([{ isFavorite: false }]);
  });

  it('keeps links saved in the last 7 or 30 days, counted back from now', () => {
    const now = new Date('2026-11-24T12:00:00.000Z');
    expect(buildLinkWhere(USER, { saved: 'week' }, { now }).AND).toEqual([
      { createdAt: { gte: new Date('2026-11-17T12:00:00.000Z') } },
    ]);
    expect(buildLinkWhere(USER, { saved: 'month' }, { now }).AND).toEqual([
      { createdAt: { gte: new Date('2026-10-25T12:00:00.000Z') } },
    ]);
  });

  it('requires every tag, case-insensitively and scoped to the user', () => {
    const where = buildLinkWhere(USER, { tag: ['ts', 'Angular'] });
    expect(where.AND).toEqual([
      { tags: { some: { tag: { userId: USER, name: { equals: 'ts', mode: 'insensitive' } } } } },
      {
        tags: { some: { tag: { userId: USER, name: { equals: 'Angular', mode: 'insensitive' } } } },
      },
    ]);
  });

  it('matches every word against title, note and URL with escaped wildcards', () => {
    const where = buildLinkWhere(USER, { q: '100% a_b' });
    expect(where.AND).toEqual([
      {
        OR: [
          { title: { contains: '100\\%', mode: 'insensitive' } },
          { note: { contains: '100\\%', mode: 'insensitive' } },
          { url: { contains: '100\\%', mode: 'insensitive' } },
        ],
      },
      {
        OR: [
          { title: { contains: 'a\\_b', mode: 'insensitive' } },
          { note: { contains: 'a\\_b', mode: 'insensitive' } },
          { url: { contains: 'a\\_b', mode: 'insensitive' } },
        ],
      },
    ]);
  });

  it('leaves the note out of the search when searchNotes is false', () => {
    const where = buildLinkWhere(USER, { q: 'word' }, { searchNotes: false });
    expect(where.AND).toEqual([
      {
        OR: [
          { title: { contains: 'word', mode: 'insensitive' } },
          { url: { contains: 'word', mode: 'insensitive' } },
        ],
      },
    ]);
    expect(buildLinkWhere(USER, { q: 'word' }, { searchNotes: true })).toEqual(
      buildLinkWhere(USER, { q: 'word' }),
    );
  });
});
