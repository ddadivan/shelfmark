import { LINK_KIND, type LinkKind } from '@shelfmark/contracts';

/** The kind chips of Recently opened after "All" (RecentView screen): "other" has no chip. */
export const RECENT_FILTER_KINDS: readonly LinkKind[] = [
  LINK_KIND.Video,
  LINK_KIND.Article,
  LINK_KIND.Shopping,
];
