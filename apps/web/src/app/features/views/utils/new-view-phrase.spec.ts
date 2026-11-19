import { VIEW_DRAFT_LIMIT } from '@shelfmark/contracts';
import { isPhraseValid, normalizePhrase } from './new-view-phrase';

describe('new view phrase', () => {
  it('collapses white space', () => {
    expect(normalizePhrase('  a \n  b ')).toBe('a b');
  });

  it('needs the contract length after trimming', () => {
    expect(isPhraseValid('  ab  ')).toBe(false);
    expect(isPhraseValid('abc')).toBe(true);
    expect(isPhraseValid('a'.repeat(VIEW_DRAFT_LIMIT.PhraseMax))).toBe(true);
    expect(isPhraseValid('a'.repeat(VIEW_DRAFT_LIMIT.PhraseMax + 1))).toBe(false);
  });
});
