import { LINK_ERROR_MESSAGE, linkLimitFit, linkLimitMessage } from '@shelfmark/contracts';

describe('linkLimitMessage / linkLimitFit (contracts)', () => {
  it('names how many links still fit and reads it back', () => {
    expect(linkLimitMessage(12)).toBe('Link limit reached: 12 more fit');
    expect(linkLimitFit(linkLimitMessage(12))).toBe(12);
    expect(linkLimitFit(linkLimitMessage(0))).toBe(0);
  });

  it('never names a negative or fractional count', () => {
    expect(linkLimitMessage(-3)).toBe('Link limit reached: 0 more fit');
    expect(linkLimitMessage(2.7)).toBe('Link limit reached: 2 more fit');
  });

  it('is null for any other message', () => {
    expect(linkLimitFit(LINK_ERROR_MESSAGE.LimitReached)).toBeNull();
    expect(linkLimitFit('Link limit reached: x more fit')).toBeNull();
    expect(linkLimitFit(['Link limit reached: 1 more fit'])).toBeNull();
    expect(linkLimitFit(undefined)).toBeNull();
  });
});
