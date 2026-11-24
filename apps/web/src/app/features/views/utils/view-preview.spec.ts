import {
  LINK_SORT_FIELD,
  SAVED_VIEW_SCOPE,
  SORT_ORDER,
  type LinkResponse,
  type ListLinksResponse,
  type SavedViewQuery,
} from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { NEW_VIEW_PREVIEW } from '../models/new-view-preview.const';
import { previewOf, previewQueryOf } from './view-preview';

const QUERY: SavedViewQuery = {
  scope: SAVED_VIEW_SCOPE.Favorites,
  folderId: null,
  tags: ['docs'],
  kind: null,
  sort: LINK_SORT_FIELD.Title,
  order: SORT_ORDER.Asc,
  q: 'x',
  saved: null,
  favorite: false,
};

function link(id: string, folderId: string | null): LinkResponse {
  return { ...MOCK_LINKS[0], id, folderId, title: `T${id}`, url: `https://www.${id}.test/p` };
}

describe('view preview', () => {
  it('asks the view filters, its sort and one big page', () => {
    expect(previewQueryOf(QUERY)).toEqual({
      favorite: true,
      tag: ['docs'],
      q: 'x',
      sort: LINK_SORT_FIELD.Title,
      order: SORT_ORDER.Asc,
      limit: NEW_VIEW_PREVIEW.Limit,
    });
  });

  it('counts pinned and listed links and shows the first rows', () => {
    const response: ListLinksResponse = {
      pinned: [link('a', 'f1')],
      items: [link('b', null), link('c', 'f1'), link('d', 'f1')],
      nextCursor: null,
    };
    const preview = previewOf(response, (id) => (id === 'f1' ? 'Reading' : null));
    expect(preview.count).toBe(4);
    expect(preview.more).toBe(false);
    expect(preview.rows).toHaveLength(NEW_VIEW_PREVIEW.Rows);
    expect(preview.rows[0]).toMatchObject({ id: 'a', host: 'a.test', folder: 'Reading' });
    expect(preview.rows[1]?.folder).toBeNull();
  });

  it('says "more" when another page follows', () => {
    const preview = previewOf(
      { pinned: [], items: [link('a', null)], nextCursor: 'c' },
      () => null,
    );
    expect(preview.more).toBe(true);
  });
});
