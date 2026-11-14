import { suppressSmallGroups } from './suppress-small-groups';

const b = (key: string, count: number) => ({ key, count });

describe('suppressSmallGroups', () => {
  it('keeps every bucket of 3 or more and every empty bucket as is', () => {
    expect(suppressSmallGroups([b('a', 3), b('b', 0), b('c', 10)], 3)).toEqual([
      b('a', 3),
      b('b', 0),
      b('c', 10),
    ]);
  });

  it('merges two small buckets into Other at the end', () => {
    expect(suppressSmallGroups([b('a', 2), b('b', 5), b('c', 1)], 3)).toEqual([
      b('b', 5),
      b('other', 3),
    ]);
  });

  it('adds the next smallest bucket when Other would hold a single value', () => {
    expect(suppressSmallGroups([b('a', 1), b('b', 7), b('c', 4), b('d', 0)], 3)).toEqual([
      b('b', 7),
      b('d', 0),
      b('other', 5),
    ]);
  });

  it('keeps adding while Other is below the minimum group size', () => {
    expect(suppressSmallGroups([b('a', 1), b('b', 1), b('c', 3), b('d', 9)], 4)).toEqual([
      b('d', 9),
      b('other', 5),
    ]);
  });

  it('answers null when even everything together stays too small', () => {
    expect(suppressSmallGroups([b('a', 1), b('b', 0), b('c', 1)], 3)).toEqual([
      b('b', 0),
      { key: 'other', count: null },
    ]);
    expect(suppressSmallGroups([b('a', 2)], 3)).toEqual([{ key: 'other', count: null }]);
  });

  it('returns an empty list for no buckets', () => {
    expect(suppressSmallGroups([], 3)).toEqual([]);
  });
});
