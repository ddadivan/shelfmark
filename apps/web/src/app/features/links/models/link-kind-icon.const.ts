import type { LinkKind } from '@shelfmark/contracts';
import type { IconName } from '@shelfmark/ui';

/**
 * The icon of each link kind (#537) in the type selects of the new view dialog and Edit link, so a
 * kind reads the same everywhere.
 */
export const LINK_KIND_ICON: Readonly<Record<LinkKind, IconName>> = {
  video: 'play',
  article: 'newspaper',
  shopping: 'shopping-bag',
  podcast: 'mic',
  document: 'file',
  code: 'code',
  app: 'smartphone',
  post: 'message',
  recipe: 'cooking-pot',
  other: 'link',
};
