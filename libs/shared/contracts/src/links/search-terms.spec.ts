import { describe, expect, it } from 'vitest';
import { LINK_LIMIT } from './link-limit.const';
import { searchTerms } from './search-terms';

describe('searchTerms', () => {
  it('splits on white space and ignores empty input', () => {
    expect(searchTerms(undefined)).toEqual([]);
    expect(searchTerms('   ')).toEqual([]);
    expect(searchTerms('  signal   store\tforms ')).toEqual(['signal', 'store', 'forms']);
  });

  it('keeps at most QueryTermsMax words', () => {
    expect(searchTerms('a b c d e f g')).toHaveLength(LINK_LIMIT.QueryTermsMax);
  });
});
