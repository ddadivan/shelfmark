import { LINK_LIMIT } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { SEARCH_TERMS_MAX } from './models/search-terms-max.const';
import { matchesQuery, parseSearchQuery, splitQuery } from './search-query';

const LINK = {
  ...MOCK_LINKS[0],
  title: 'Signal Forms in 20 minutes',
  note: 'Interview prep',
  url: 'https://youtube.com/watch?v=abc',
};

describe('splitQuery', () => {
  it('splits on white space and drops empty parts', () => {
    expect(splitQuery('  signal   store\tforms ')).toEqual(['signal', 'store', 'forms']);
    expect(splitQuery('   ')).toEqual([]);
  });

  it('keeps at most SEARCH_TERMS_MAX words', () => {
    expect(splitQuery('a b c d e f g')).toHaveLength(SEARCH_TERMS_MAX);
  });
});

describe('parseSearchQuery', () => {
  it('trims and collapses white space', () => {
    expect(parseSearchQuery('  signal   store ')).toBe('signal store');
  });

  it('is empty for anything that is not text', () => {
    expect(parseSearchQuery(undefined)).toBe('');
    expect(parseSearchQuery(['a', 'b'])).toBe('');
  });

  it('cuts at the query limit', () => {
    expect(parseSearchQuery('a'.repeat(LINK_LIMIT.QueryMax + 50))).toHaveLength(
      LINK_LIMIT.QueryMax,
    );
  });
});

describe('matchesQuery', () => {
  it('matches the title, the note and the URL ignoring case', () => {
    expect(matchesQuery(LINK, 'SIGNAL')).toBe(true);
    expect(matchesQuery(LINK, 'interview')).toBe(true);
    expect(matchesQuery(LINK, 'youtube.com')).toBe(true);
    expect(matchesQuery(LINK, 'pasta')).toBe(false);
  });

  it('needs every word, in any field', () => {
    expect(matchesQuery(LINK, 'signal interview')).toBe(true);
    expect(matchesQuery(LINK, 'signal pasta')).toBe(false);
  });

  it('copes with a link without a note', () => {
    expect(matchesQuery({ ...LINK, note: null }, 'interview')).toBe(false);
    expect(matchesQuery({ ...LINK, note: null }, 'forms')).toBe(true);
  });

  it('matches everything for an empty query', () => {
    expect(matchesQuery(LINK, '  ')).toBe(true);
  });
});
