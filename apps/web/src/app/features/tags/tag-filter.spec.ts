import { LINK_LIMIT } from '@shelfmark/contracts';
import { parseTagFilter } from './tag-filter';

describe('parseTagFilter', () => {
  it('reads a single value and a repeated parameter', () => {
    expect(parseTagFilter('docs')).toEqual(['docs']);
    expect(parseTagFilter(['docs', 'video'])).toEqual(['docs', 'video']);
  });

  it('returns nothing for an absent or empty filter', () => {
    expect(parseTagFilter(undefined)).toEqual([]);
    expect(parseTagFilter('')).toEqual([]);
    expect(parseTagFilter(['  ', ''])).toEqual([]);
  });

  it('normalizes each value like a tag name', () => {
    expect(parseTagFilter(['  winter sale  '])).toEqual(['winter-sale']);
  });

  it('collapses duplicates ignoring case, the first spelling wins', () => {
    expect(parseTagFilter(['Docs', 'docs', 'DOCS', 'video'])).toEqual(['Docs', 'video']);
  });

  it('keeps at most the filter maximum', () => {
    const many = Array.from({ length: LINK_LIMIT.TagFilterMax + 3 }, (_, n) => `t${n}`);

    expect(parseTagFilter(many)).toEqual(many.slice(0, LINK_LIMIT.TagFilterMax));
  });

  it('ignores values that are not text', () => {
    expect(parseTagFilter([1, null, 'docs', { a: 1 }])).toEqual(['docs']);
  });
});
