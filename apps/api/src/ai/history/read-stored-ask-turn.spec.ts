import { decodeAskHistoryCursor, encodeAskHistoryCursor } from './ask-history-cursor';
import { askConversationTitle } from './ask-history.service';
import { readStoredCards, readStoredDepth, readStoredSteps } from './read-stored-ask-turn';

const ID = '0192f3a4-5b6c-7d8e-9f01-23456789abcd';

describe('stored Ask turn readers', () => {
  it('keeps valid steps and drops malformed ones', () => {
    expect(
      readStoredSteps([
        { activity: 'search', found: 3 },
        { activity: 'read', found: null },
        { activity: 'count', found: -1 },
        { activity: 'hack', found: 1 },
        'x',
        null,
      ]),
    ).toEqual([
      { activity: 'search', found: 3 },
      { activity: 'read', found: null },
      { activity: 'count', found: null },
    ]);
    expect(readStoredSteps({ activity: 'search' })).toEqual([]);
  });

  it('keeps valid card groups, markers and searches', () => {
    const search = { q: 'ramen', folderId: ID, tags: ['food'], kind: 'recipe', favorite: false };
    expect(
      readStoredCards([
        { n: [1, 2, 0, 100, 'x', 2.5], total: 9, search },
        { n: [3], total: -2, search: { ...search, kind: 'nope' } },
        { n: [4], total: null, search: { ...search, folderId: 'x' } },
        { n: [5], total: null, search: { ...search, tags: [1] } },
        { n: [6], total: null, search: { ...search, q: 1 } },
        { n: [7], total: null, search: { ...search, favorite: 'yes' } },
        { n: 'x' },
        null,
      ]),
    ).toEqual([
      { n: [1, 2], total: 9, search },
      { n: [3], total: null, search: null },
      { n: [4], total: null, search: null },
      { n: [5], total: null, search: null },
      { n: [6], total: null, search: null },
      { n: [7], total: null, search: null },
    ]);
    expect(readStoredCards('nope')).toEqual([]);
    expect(
      readStoredCards([
        {
          n: [1],
          total: null,
          search: { q: null, folderId: null, tags: [], kind: null, favorite: true },
        },
      ])[0]?.search,
    ).toEqual({ q: null, folderId: null, tags: [], kind: null, favorite: true });
  });

  it('reads an unknown depth as quick', () => {
    expect(readStoredDepth('deep')).toBe('deep');
    expect(readStoredDepth('weird')).toBe('quick');
  });

  it('titles a conversation by its first question, cut to 120 characters', () => {
    expect(askConversationTitle('  Hello  ')).toBe('Hello');
    expect(Array.from(askConversationTitle('😀'.repeat(200)))).toHaveLength(120);
    expect(askConversationTitle('   ')).toBe('…');
  });

  it('round-trips the list cursor and refuses anything malformed', () => {
    const cursor = { updatedAt: new Date('2026-11-24T10:00:00.000Z'), id: ID };
    expect(decodeAskHistoryCursor(encodeAskHistoryCursor(cursor))).toEqual(cursor);
    const encode = (text: string) => Buffer.from(text, 'utf8').toString('base64url');
    expect(decodeAskHistoryCursor('')).toBeNull();
    expect(decodeAskHistoryCursor('a+b')).toBeNull();
    expect(decodeAskHistoryCursor('a'.repeat(121))).toBeNull();
    expect(decodeAskHistoryCursor(encode(`2026-11-24T10:00:00.000Z|nope`))).toBeNull();
    expect(decodeAskHistoryCursor(encode(`2026-11-24T10:00:00.000Z|${ID}|x`))).toBeNull();
    expect(decodeAskHistoryCursor(encode(`yesterday|${ID}`))).toBeNull();
    expect(decodeAskHistoryCursor(encode(`2026-11-24|${ID}`))).toBeNull();
    expect(decodeAskHistoryCursor(encode('only'))).toBeNull();
  });
});
