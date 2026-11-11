import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { matchesHistorySearch, searchWords } from './history-search';

function link(title: string, url: string): LinkResponse {
  return { ...MOCK_LINKS[0], title, url };
}

describe('history search', () => {
  const coat = link('Wool coat, straight cut', 'https://www.cos.com/en/coat');

  it('splits a query into lower-case words', () => {
    expect(searchWords('  Wool   COAT ')).toEqual(['wool', 'coat']);
    expect(searchWords('   ')).toEqual([]);
  });

  it('matches everything without words', () => {
    expect(matchesHistorySearch(coat, [])).toBe(true);
  });

  it('matches the title and the domain, every word, ignoring case', () => {
    expect(matchesHistorySearch(coat, searchWords('WOOL'))).toBe(true);
    expect(matchesHistorySearch(coat, searchWords('cos.com'))).toBe(true);
    expect(matchesHistorySearch(coat, searchWords('coat cos'))).toBe(true);
    expect(matchesHistorySearch(coat, searchWords('coat ramen'))).toBe(false);
  });

  it('does not match the path or the note', () => {
    expect(matchesHistorySearch(coat, searchWords('/en/'))).toBe(false);
  });
});
