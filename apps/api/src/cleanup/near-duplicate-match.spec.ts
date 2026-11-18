import {
  groupNearPairs,
  isNearDuplicate,
  sameHostFamily,
  titleOverlap,
} from './near-duplicate-match';

describe('near-duplicate match', () => {
  it('treats www, equal hosts and subdomains as one family', () => {
    expect(sameHostFamily('https://www.example.com/a', 'https://example.com/b')).toBe(true);
    expect(sameHostFamily('https://blog.example.com/a', 'https://example.com/a')).toBe(true);
    expect(sameHostFamily('https://example.com/a', 'https://m.blog.example.com/a')).toBe(true);
    expect(sameHostFamily('https://example.com/a', 'https://notexample.com/a')).toBe(false);
    expect(sameHostFamily('https://example.com', 'not a url')).toBe(false);
  });

  it('measures title overlap by word stems', () => {
    expect(titleOverlap('Wool coats for winter', 'Wool coat winter')).toBe(1);
    expect(titleOverlap('Wool coat', 'Rain jacket')).toBe(0);
    expect(titleOverlap('', 'Rain jacket')).toBe(0);
    expect(titleOverlap('Angular signals guide', 'Angular signals intro')).toBe(0.5);
  });

  it('needs close vectors and the same site family or overlapping titles', () => {
    const coat = { url: 'https://shop.example.com/coat', title: 'Wool coat' };
    const mobile = { url: 'https://m.example.com/coat', title: 'Other words' };
    const elsewhere = { url: 'https://other.test/coat', title: 'Wool coat' };
    const unrelated = { url: 'https://other.test/x', title: 'Rain jacket' };
    expect(isNearDuplicate(0.95, coat, mobile)).toBe(false);
    expect(isNearDuplicate(0.95, coat, { ...mobile, url: 'https://example.com/c' })).toBe(true);
    expect(isNearDuplicate(0.95, coat, elsewhere)).toBe(true);
    expect(isNearDuplicate(0.95, coat, unrelated)).toBe(false);
    expect(isNearDuplicate(0.92, coat, elsewhere)).toBe(false);
  });

  it('groups pairs by union-find, leaves out excluded links and caps the group size', () => {
    expect(
      groupNearPairs(
        [
          ['b', 'a'],
          ['b', 'c'],
          ['x', 'y'],
          ['e', 'e'],
        ],
        new Set(),
      ),
    ).toEqual([
      ['a', 'b', 'c'],
      ['x', 'y'],
    ]);
    expect(
      groupNearPairs(
        [
          ['a', 'b'],
          ['b', 'c'],
        ],
        new Set(['b']),
      ),
    ).toEqual([]);
    const chain: [string, string][] = [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['d', 'e'],
      ['e', 'f'],
      ['f', 'g'],
    ];
    const groups = groupNearPairs(chain, new Set(), 3);
    expect(groups.every((group) => group.length <= 3)).toBe(true);
    expect(groups).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ]);
  });
});
