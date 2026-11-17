import { clipReason, fallbackWhy, summaryClauses, whyForQuery, whyForRelated } from './meaning-why';

const COAT = {
  tagNames: ['clothing', 'Winter'],
  folderName: 'Shopping',
  summary: 'A guide to warm coats. Covers sizes, fabrics and prices.',
};

describe('whyForQuery', () => {
  it('quotes tags, folder and summary clauses that share a stem with the query, at most two', () => {
    expect(whyForQuery('winter shopping', COAT)).toEqual([
      { source: 'tag', text: 'Winter' },
      { source: 'folder', text: 'Shopping' },
    ]);
    expect(whyForQuery('fabric prices', COAT)).toEqual([
      { source: 'summary', text: 'fabrics and prices' },
    ]);
  });

  it('falls back to the tags, then the folder, then the first summary clause', () => {
    expect(whyForQuery('something else', COAT)).toEqual([
      { source: 'tag', text: 'clothing' },
      { source: 'tag', text: 'Winter' },
    ]);
    expect(whyForQuery('else', { ...COAT, tagNames: [] })).toEqual([
      { source: 'folder', text: 'Shopping' },
    ]);
    expect(whyForQuery('else', { ...COAT, tagNames: [], folderName: null })).toEqual([
      { source: 'summary', text: 'A guide to warm coats' },
    ]);
    expect(fallbackWhy({ tagNames: [], folderName: null, summary: null })).toEqual([]);
  });

  it('clips long reasons to 80 characters', () => {
    const long = 'word '.repeat(40);
    const [only] = whyForQuery('word', { tagNames: [], folderName: null, summary: long });
    expect(Array.from(only?.text ?? '')).toHaveLength(80);
    expect(only?.text.endsWith('…')).toBe(true);
    expect(clipReason('  a   b ')).toBe('a b');
  });

  it('splits a summary into clauses', () => {
    expect(summaryClauses('One. Two; three, four!')).toEqual(['One', 'Two', 'three', 'four']);
    expect(summaryClauses(null)).toEqual([]);
  });
});

describe('whyForRelated', () => {
  const origin = { ...COAT, title: 'Winter coat guide', folderId: 'f1' };

  it('prefers shared tags, then the same folder, then summary clauses with shared stems', () => {
    expect(
      whyForRelated(origin, {
        tagNames: ['winter', 'x'],
        folderName: 'Other',
        summary: null,
        folderId: 'f2',
      }),
    ).toEqual([{ source: 'tag', text: 'winter' }]);
    expect(
      whyForRelated(origin, {
        tagNames: ['x'],
        folderName: 'Shopping',
        summary: null,
        folderId: 'f1',
      }),
    ).toEqual([{ source: 'folder', text: 'Shopping' }]);
    expect(
      whyForRelated(origin, {
        tagNames: ['x'],
        folderName: 'Other',
        summary: 'Parkas and coats compared. Nothing else',
        folderId: 'f2',
      }),
    ).toEqual([{ source: 'summary', text: 'Parkas and coats compared' }]);
    expect(
      whyForRelated(origin, {
        tagNames: ['x'],
        folderName: null,
        summary: 'Unrelated',
        folderId: null,
      }),
    ).toEqual([{ source: 'tag', text: 'x' }]);
  });
});
