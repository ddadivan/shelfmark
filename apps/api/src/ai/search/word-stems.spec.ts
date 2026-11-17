import { wordStem, wordStems } from './word-stems';
import { normalizeMeaningQuery } from './meaning-search.service';

describe('wordStem / wordStems', () => {
  it('strips one common suffix and keeps short words whole', () => {
    expect(wordStem('Signals')).toBe('signal');
    expect(wordStem('performance')).toBe('perform');
    expect(wordStem('cooking')).toBe('cook');
    expect(wordStem('speed')).toBe('speed');
    expect(wordStem('glass')).toBe('glass');
    expect(wordStem('notes')).toBe('note');
  });

  it('answers distinct stems of words with three or more letters, without stop words', () => {
    expect(wordStems('The cat, an ox and THE cats about signals')).toEqual(['cat', 'signal']);
    expect(wordStems('Ramen in Tōkyō 2026')).toEqual(['ramen', 'tōkyō', '2026']);
  });
});

describe('normalizeMeaningQuery', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeMeaningQuery('  warm \n\t jackets  ')).toBe('warm jackets');
  });
});
