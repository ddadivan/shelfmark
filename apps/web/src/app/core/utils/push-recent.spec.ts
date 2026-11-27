import { pushRecent } from './push-recent';

describe('pushRecent', () => {
  it('puts a new item first', () => {
    expect(pushRecent(['a', 'b'], 'c', 5)).toEqual(['c', 'a', 'b']);
  });

  it('moves an existing item to the front without a duplicate', () => {
    expect(pushRecent(['a', 'b', 'c'], 'c', 5)).toEqual(['c', 'a', 'b']);
  });

  it('keeps at most max entries', () => {
    expect(pushRecent(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b']);
  });

  it('uses the given comparison', () => {
    const caseless = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();
    expect(pushRecent(['Shelf', 'other'], 'shelf', 5, caseless)).toEqual(['shelf', 'other']);
    expect(pushRecent(['Shelf', 'other'], 'shelf', 5)).toEqual(['shelf', 'Shelf', 'other']);
  });

  it('handles null as an item (Unsorted) and does not change the input', () => {
    const list: (string | null)[] = ['a', null];
    expect(pushRecent(list, null, 5)).toEqual([null, 'a']);
    expect(list).toEqual(['a', null]);
  });
});
