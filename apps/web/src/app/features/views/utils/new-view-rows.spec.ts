import {
  LINK_KIND,
  LINK_SORT_FIELD,
  SAVED_VIEW_LIMIT,
  SAVED_VIEW_SCOPE,
  SAVED_WITHIN,
  SORT_ORDER,
  VIEW_DRAFT_FIELD,
  type SavedViewQuery,
} from '@shelfmark/contracts';
import { ALL_KINDS } from '../../links/models/all-kinds.const';
import { FEED_SORT } from '../../links/models/feed-sort.const';
import { VIEW_SAVED_ANY } from '../models/view-saved-any.const';
import { VIEW_WHERE } from '../models/view-where.const';
import { queryOfRows, rowsOfQuery, sameRow } from './new-view-rows';

const QUERY: SavedViewQuery = {
  scope: SAVED_VIEW_SCOPE.Folder,
  folderId: 'f1',
  tags: ['docs'],
  kind: LINK_KIND.Video,
  sort: LINK_SORT_FIELD.Title,
  order: SORT_ORDER.Asc,
  q: 'signals',
  saved: null,
  favorite: false,
};

describe('new view rows', () => {
  it('shows a stored query in the rows and back', () => {
    const rows = rowsOfQuery(QUERY);
    expect(rows).toEqual({
      where: 'f1',
      kind: LINK_KIND.Video,
      tags: ['docs'],
      q: 'signals',
      sort: FEED_SORT.Title,
      saved: VIEW_SAVED_ANY,
      favorite: false,
    });
    expect(queryOfRows(rows)).toEqual(QUERY);
    const fresh = { ...QUERY, saved: SAVED_WITHIN.Week, favorite: true };
    expect(rowsOfQuery(fresh)).toMatchObject({ saved: SAVED_WITHIN.Week, favorite: true });
    expect(queryOfRows(rowsOfQuery(fresh))).toEqual(fresh);
    expect(queryOfRows({ ...rows, saved: 'year' }).saved).toBeNull();
    expect(queryOfRows({ ...rows, where: VIEW_WHERE.Favorites, favorite: true }).favorite).toBe(
      false,
    );
  });

  it('maps the three places without a folder', () => {
    const base = rowsOfQuery({ ...QUERY, scope: SAVED_VIEW_SCOPE.Unsorted, folderId: null });
    expect(base.where).toBe(VIEW_WHERE.Unsorted);
    expect(queryOfRows(base)).toMatchObject({ scope: SAVED_VIEW_SCOPE.Unsorted, folderId: null });
    expect(queryOfRows({ ...base, where: VIEW_WHERE.Favorites }).scope).toBe(
      SAVED_VIEW_SCOPE.Favorites,
    );
  });

  it('stores "All" types as no kind and keeps a kind the segments do not show', () => {
    const rows = rowsOfQuery({ ...QUERY, kind: null });
    expect(rows.kind).toBe(ALL_KINDS);
    expect(queryOfRows(rows).kind).toBeNull();
    expect(queryOfRows({ ...rows, kind: LINK_KIND.Other }).kind).toBe(LINK_KIND.Other);
  });

  it('normalizes tags, cuts them to the limit and trims the search', () => {
    const rows = {
      ...rowsOfQuery(QUERY),
      tags: ['A', 'a', 'b', 'c', 'd', 'e', 'f'],
      q: '  words  ',
    };
    const query = queryOfRows(rows);
    expect(query.tags).toHaveLength(SAVED_VIEW_LIMIT.TagsMax);
    expect(query.q).toBe('words');
  });

  it('compares a row by its value', () => {
    const a = rowsOfQuery(QUERY);
    expect(sameRow(VIEW_DRAFT_FIELD.Tags, a, { ...a, tags: ['DOCS'] })).toBe(true);
    expect(sameRow(VIEW_DRAFT_FIELD.Tags, a, { ...a, tags: ['docs', 'x'] })).toBe(false);
    expect(sameRow(VIEW_DRAFT_FIELD.Q, a, { ...a, q: ' signals ' })).toBe(true);
    expect(sameRow(VIEW_DRAFT_FIELD.Sort, a, { ...a, sort: FEED_SORT.Newest })).toBe(false);
    expect(sameRow(VIEW_DRAFT_FIELD.Scope, a, { ...a, where: 'f2' })).toBe(false);
    expect(sameRow(VIEW_DRAFT_FIELD.Kind, a, { ...a })).toBe(true);
  });
});
