import type { TagResponse } from '@shelfmark/contracts';

/** The sidebar list: the tags shown and how many more are folded away. */
export interface TagSplit {
  readonly shown: readonly TagResponse[];
  /** Tags behind "+N more"; 0 when everything is shown. */
  readonly hidden: number;
  /** More than `TAGS_TOP_COUNT` tags exist, so the toggle is needed. */
  readonly foldable: boolean;
}
