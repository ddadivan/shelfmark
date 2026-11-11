import { LINK_KIND, LINK_SORT_FIELD, SORT_ORDER, type SavedViewQuery } from '@shelfmark/contracts';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import {
  isAllFilter,
  listQueryOf,
  normalizeViewQuery,
  sameViewQuery,
  viewNavigation,
  viewQueryOf,
} from './saved-view-query';

const FOLDER = '00000000-0000-4000-8000-000000000101';
const BASE: SavedViewQuery = {
  scope: LINKS_SCOPE.All,
  folderId: null,
  tags: [],
  kind: null,
  sort: LINK_SORT_FIELD.CreatedAt,
  order: SORT_ORDER.Desc,
  q: '',
};

describe('saved view queries', () => {
  it('turns a feed filter into a complete query', () => {
    expect(viewQueryOf({ scope: LINKS_SCOPE.All })).toEqual(BASE);
    expect(
      viewQueryOf({
        scope: LINKS_SCOPE.Folder,
        folderId: FOLDER,
        tags: ['a'],
        q: 'x',
        kind: LINK_KIND.Article,
        sort: LINK_SORT_FIELD.Title,
        order: SORT_ORDER.Asc,
      }),
    ).toEqual({
      scope: LINKS_SCOPE.Folder,
      folderId: FOLDER,
      tags: ['a'],
      kind: LINK_KIND.Article,
      sort: LINK_SORT_FIELD.Title,
      order: SORT_ORDER.Asc,
      q: 'x',
    });
  });

  it('normalizes a request like the API', () => {
    expect(normalizeViewQuery({ scope: LINKS_SCOPE.Favorites })).toEqual({
      ...BASE,
      scope: LINKS_SCOPE.Favorites,
    });
    expect(
      normalizeViewQuery({
        scope: LINKS_SCOPE.All,
        tags: ['read later', 'READ-later', ' '],
        q: ' x ',
      }),
    ).toMatchObject({ tags: ['read-later'], q: 'x' });
  });

  it('matches a filter regardless of tag order and case, but not another sort or kind', () => {
    const query = { ...BASE, tags: ['b', 'A'], kind: LINK_KIND.Video };
    const filter = { scope: LINKS_SCOPE.All, tags: ['a', 'B'], kind: LINK_KIND.Video } as const;
    expect(sameViewQuery(query, filter)).toBe(true);
    expect(sameViewQuery(query, { ...filter, kind: LINK_KIND.Article })).toBe(false);
    expect(sameViewQuery(query, { ...filter, tags: ['a'] })).toBe(false);
    expect(sameViewQuery(query, { ...filter, sort: LINK_SORT_FIELD.Title })).toBe(false);
    expect(
      sameViewQuery(
        { ...BASE, scope: LINKS_SCOPE.Folder, folderId: FOLDER.toUpperCase() },
        { scope: LINKS_SCOPE.Folder, folderId: FOLDER },
      ),
    ).toBe(true);
  });

  it('knows when nothing is narrowed', () => {
    expect(isAllFilter({ scope: LINKS_SCOPE.All })).toBe(true);
    expect(isAllFilter({ scope: LINKS_SCOPE.All, sort: LINK_SORT_FIELD.Title })).toBe(true);
    expect(isAllFilter({ scope: LINKS_SCOPE.Unsorted })).toBe(false);
    expect(isAllFilter({ scope: LINKS_SCOPE.All, tags: ['a'] })).toBe(false);
    expect(isAllFilter({ scope: LINKS_SCOPE.All, q: 'x' })).toBe(false);
    expect(isAllFilter({ scope: LINKS_SCOPE.All, kind: LINK_KIND.Video })).toBe(false);
  });

  it('builds the list query of a view', () => {
    expect(listQueryOf(BASE)).toEqual({});
    expect(listQueryOf({ ...BASE, scope: LINKS_SCOPE.Unsorted })).toEqual({ unsorted: true });
    expect(listQueryOf({ ...BASE, scope: LINKS_SCOPE.Favorites })).toEqual({ favorite: true });
    expect(
      listQueryOf({
        ...BASE,
        scope: LINKS_SCOPE.Folder,
        folderId: FOLDER,
        tags: ['a'],
        kind: LINK_KIND.Shopping,
        q: 'mug',
      }),
    ).toEqual({ folderId: FOLDER, tag: ['a'], kind: LINK_KIND.Shopping, q: 'mug' });
  });

  it('leads to the route of the scope with the filter as query parameters', () => {
    expect(viewNavigation(BASE)).toEqual({ commands: ['/', 'links'], queryParams: {} });
    expect(viewNavigation({ ...BASE, scope: LINKS_SCOPE.Unsorted }).commands).toEqual([
      '/',
      'unsorted',
    ]);
    expect(viewNavigation({ ...BASE, scope: LINKS_SCOPE.Favorites }).commands).toEqual([
      '/',
      'favorites',
    ]);
    expect(
      viewNavigation({
        ...BASE,
        scope: LINKS_SCOPE.Folder,
        folderId: FOLDER,
        tags: ['a', 'b'],
        q: 'x',
        kind: LINK_KIND.Video,
        sort: LINK_SORT_FIELD.Title,
        order: SORT_ORDER.Asc,
      }),
    ).toEqual({
      commands: ['/', 'folders', FOLDER],
      queryParams: { tag: ['a', 'b'], q: 'x', kind: LINK_KIND.Video, sort: 'title' },
    });
    expect(viewNavigation({ ...BASE, order: SORT_ORDER.Asc }).queryParams).toEqual({
      sort: 'oldest',
    });
  });
});
