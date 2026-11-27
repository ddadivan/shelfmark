import type { IconName } from '@shelfmark/ui';

/**
 * What the header search is limited to while a feed other than All links is on screen: a folder
 * (`name`, `icon`, `colour`: drawn as the folder tile) or Unsorted / Favorites (`labelKey`, the
 * Transloco key of the scope name, and the `icon` of its sidebar row; `colour` is `null`).
 */
export interface FeedSearchScope {
  readonly labelKey: string | null;
  readonly name: string | null;
  readonly icon: IconName | string;
  readonly colour: string | null;
}
