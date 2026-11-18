import { fuseRanks } from './fuse-ranks';

describe('fuseRanks', () => {
  it('puts ids found by both lists first, then by rank, ties in first-seen order', () => {
    expect(
      fuseRanks(
        [
          ['a', 'b', 'c'],
          ['c', 'd'],
        ],
        10,
      ),
    ).toEqual(['c', 'a', 'b', 'd']);
    expect(fuseRanks([['a'], ['b']], 10)).toEqual(['a', 'b']);
  });

  it('caps the result and handles empty lists', () => {
    expect(fuseRanks([['a', 'b', 'c']], 2)).toEqual(['a', 'b']);
    expect(fuseRanks([[], []], 10)).toEqual([]);
  });
});
