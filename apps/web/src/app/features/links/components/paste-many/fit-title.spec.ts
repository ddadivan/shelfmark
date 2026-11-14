import { LINK_LIMIT } from '@shelfmark/contracts';
import { fitTitle } from './fit-title';

describe('fitTitle', () => {
  it('keeps a short title and trims it', () => {
    expect(fitTitle('  Wool coat  ')).toBe('Wool coat');
  });

  it('cuts to the title limit in UTF-16 units', () => {
    expect(fitTitle('a'.repeat(LINK_LIMIT.TitleMax + 20))).toHaveLength(LINK_LIMIT.TitleMax);
  });

  it('never cuts inside a surrogate pair', () => {
    const fitted = fitTitle('a'.repeat(LINK_LIMIT.TitleMax - 1) + '😀');

    expect(fitted).toBe('a'.repeat(LINK_LIMIT.TitleMax - 1));
  });
});
