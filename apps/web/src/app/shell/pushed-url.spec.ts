import { isPushedUrl } from './pushed-url';

describe('isPushedUrl', () => {
  it('is true for Tidy Unsorted and Ask only, ignoring the query, fragment and a trailing slash', () => {
    expect(isPushedUrl('/unsorted/tidy')).toBe(true);
    expect(isPushedUrl('/ask')).toBe(true);
    expect(isPushedUrl('/ask/')).toBe(true);
    expect(isPushedUrl('/unsorted/tidy/?x=1#a')).toBe(true);
    expect(isPushedUrl('/unsorted')).toBe(false);
    expect(isPushedUrl('/links')).toBe(false);
  });

  it('is true for any page with the link preview open (#553)', () => {
    expect(isPushedUrl('/links?preview=abc')).toBe(true);
    expect(isPushedUrl('/folders/f1?sort=oldest&preview=abc#x')).toBe(true);
    expect(isPushedUrl('/links?previewed=1')).toBe(false);
  });
});
