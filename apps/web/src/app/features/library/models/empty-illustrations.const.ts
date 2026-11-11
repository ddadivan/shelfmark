import type { IllustrationName } from '@shelfmark/ui';
import type { LinksScope } from '../../links/models/links-scope.type';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';

/** Scene of the empty state of each feed scope (EmptyStates.dc.html plus the #315 scenes). */
export const EMPTY_ILLUSTRATIONS: Readonly<Record<LinksScope, IllustrationName>> = {
  [LINKS_SCOPE.All]: 'empty-feed',
  [LINKS_SCOPE.Unsorted]: 'empty-unsorted',
  [LINKS_SCOPE.Favorites]: 'empty-favorites',
  [LINKS_SCOPE.Folder]: 'empty-folder',
};
