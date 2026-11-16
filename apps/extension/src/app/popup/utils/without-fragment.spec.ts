import { withoutFragment } from './without-fragment';

describe('withoutFragment', () => {
  it('drops the fragment and keeps the query', () => {
    expect(withoutFragment('https://a.dev/p?q=1#section')).toBe('https://a.dev/p?q=1');
  });

  it('keeps a URL without a fragment as it is', () => {
    expect(withoutFragment('https://a.dev/p')).toBe('https://a.dev/p');
  });
});
