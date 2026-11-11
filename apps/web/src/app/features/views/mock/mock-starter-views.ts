import { LINK_KIND, LINK_SORT_FIELD, SAVED_VIEW_SCOPE, SORT_ORDER } from '@shelfmark/contracts';
import type { MockSavedView } from './models/mock-saved-view.interface';

/** The starter views every account gets (the API's sign-up trigger): Videos and Articles. */
export function mockStarterViews(): MockSavedView[] {
  const base = {
    scope: SAVED_VIEW_SCOPE.All,
    folderId: null,
    tags: [],
    sort: LINK_SORT_FIELD.CreatedAt,
    order: SORT_ORDER.Desc,
    q: '',
  };
  return [
    {
      id: '00000000-0000-4000-8000-00000000a001',
      name: 'Videos',
      query: { ...base, kind: LINK_KIND.Video },
    },
    {
      id: '00000000-0000-4000-8000-00000000a002',
      name: 'Articles',
      query: { ...base, kind: LINK_KIND.Article },
    },
  ];
}
