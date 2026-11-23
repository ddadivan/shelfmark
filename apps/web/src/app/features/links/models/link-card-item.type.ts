import type { LinkResponse } from '@shelfmark/contracts';

/**
 * What a link card renders: a saved link, or a link of a public collection (#276). `id` picks the
 * placeholder tone, `createdAt` is the date on the card and `remindAt` its reminder chip (#275);
 * the summary fields (#391) fill the note slot when the note is empty; all are optional.
 */
export type LinkCardItem = Pick<
  LinkResponse,
  'url' | 'title' | 'note' | 'faviconUrl' | 'imageUrl' | 'tags' | 'isFavorite' | 'pinnedInFolderAt'
> &
  Partial<
    Pick<
      LinkResponse,
      'id' | 'kind' | 'createdAt' | 'remindAt' | 'summary' | 'summarySource' | 'aiStatus'
    >
  >;
