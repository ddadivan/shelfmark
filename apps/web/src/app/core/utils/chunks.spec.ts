import { chunks } from './chunks';

describe('chunks', () => {
  it('cuts a list into slices of at most the size', () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunks([1, 2], 2)).toEqual([[1, 2]]);
    expect(chunks([], 2)).toEqual([]);
  });
});
