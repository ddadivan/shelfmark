import type { TagResponse } from '@shelfmark/contracts';
import { TAGS_TOP_COUNT } from './models/tags-top-count.const';
import type { TagSplit } from './models/tag-split.interface';

/** Top `TAGS_TOP_COUNT` tags (the list is already most-used first) unless `expanded`. */
export function splitTags(tags: readonly TagResponse[], expanded: boolean): TagSplit {
  const foldable = tags.length > TAGS_TOP_COUNT;
  if (!foldable || expanded) {
    return { shown: tags, hidden: 0, foldable };
  }
  return { shown: tags.slice(0, TAGS_TOP_COUNT), hidden: tags.length - TAGS_TOP_COUNT, foldable };
}
