import { isPushedUrl } from './pushed-url';

describe('isPushedUrl', () => {
  it('is true for Tidy Unsorted only, ignoring the query, fragment and a trailing slash', () => {
    expect(isPushedUrl('/unsorted/tidy')).toBe(true);
    expect(isPushedUrl('/unsorted/tidy/?x=1#a')).toBe(true);
    expect(isPushedUrl('/unsorted')).toBe(false);
    expect(isPushedUrl('/links')).toBe(false);
  });
});
