import type { LinkResponse } from '@shelfmark/contracts';

/** What a link card renders: a saved link, or a link of a public collection (#276). */
export type LinkCardItem = Pick<
  LinkResponse,
  'url' | 'title' | 'note' | 'faviconUrl' | 'imageUrl' | 'tags' | 'isFavorite' | 'pinnedInFolderAt'
>;
