import { describe, expect, it } from 'vitest';
import { paginate } from './paginate';

describe('paginate', () => {
  const encode = (row: number): string => `c${row}`;

  it('drops the look-ahead row and cursors on the last returned one', () => {
    expect(paginate([1, 2, 3], 2, encode)).toEqual({ items: [1, 2], nextCursor: 'c2' });
  });

  it('has no cursor when the rows fit the limit', () => {
    expect(paginate([1, 2], 2, encode)).toEqual({ items: [1, 2], nextCursor: null });
    expect(paginate([], 2, encode)).toEqual({ items: [], nextCursor: null });
  });
});
