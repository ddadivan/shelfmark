import type { LinkResponse } from '@shelfmark/contracts';

/**
 * What a link card renders: a saved link, or a link of a public collection (#276). `id` picks the
 * placeholder tone and `createdAt` is the date on the card; both are optional.
 */
export type LinkCardItem = Pick<
  LinkResponse,
  'url' | 'title' | 'note' | 'faviconUrl' | 'imageUrl' | 'tags' | 'isFavorite' | 'pinnedInFolderAt'
> &
  Partial<Pick<LinkResponse, 'id' | 'createdAt'>>;
