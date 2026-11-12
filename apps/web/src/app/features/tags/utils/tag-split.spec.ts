import type { TagResponse } from '@shelfmark/contracts';
import { MOCK_TAGS } from '@shelfmark/contracts/testing';
import { TAGS_TOP_COUNT } from '../models/tags-top-count.const';
import { splitTags } from './tag-split';

function tags(count: number): TagResponse[] {
  return Array.from({ length: count }, (_, n) => ({ ...MOCK_TAGS[0], id: `t${n}`, name: `t${n}` }));
}

describe('splitTags', () => {
  it('shows everything when there are at most the top count', () => {
    const split = splitTags(tags(TAGS_TOP_COUNT), false);

    expect(split.shown).toHaveLength(TAGS_TOP_COUNT);
    expect(split.hidden).toBe(0);
    expect(split.foldable).toBe(false);
  });

  it('shows the top tags and counts the rest', () => {
    const split = splitTags(tags(15), false);

    expect(split.shown.map((tag) => tag.name)).toEqual(tags(TAGS_TOP_COUNT).map((tag) => tag.name));
    expect(split.hidden).toBe(7);
    expect(split.foldable).toBe(true);
  });

  it('shows all of them once expanded, and stays foldable for "Show less"', () => {
    const split = splitTags(tags(15), true);

    expect(split.shown).toHaveLength(15);
    expect(split.hidden).toBe(0);
    expect(split.foldable).toBe(true);
  });

  it('handles no tags', () => {
    expect(splitTags([], false)).toEqual({ shown: [], hidden: 0, foldable: false });
  });
});
