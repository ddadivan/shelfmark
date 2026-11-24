import {
  LINK_KIND,
  LINK_LIMIT,
  SAVED_VIEW_LIMIT,
  SAVED_VIEW_SCOPE,
  SAVED_WITHIN,
  VIEW_DRAFT_FIELD,
  type LinkKind,
  type SavedViewQuery,
  type SavedWithin,
  type ViewDraftField,
} from '@shelfmark/contracts';
import { ALL_KINDS } from '../../links/models/all-kinds.const';
import type { NewViewRows } from '../models/new-view-rows.interface';
import { VIEW_SAVED_ANY } from '../models/view-saved-any.const';
import { VIEW_WHERE } from '../models/view-where.const';
import { feedSortOf, sortFieldsOf } from './view-sort';
import { normalizeViewQuery } from './saved-view-query';

const KINDS: readonly string[] = Object.values(LINK_KIND);

function isLinkKind(value: string): value is LinkKind {
  return KINDS.includes(value);
}

const PERIODS: readonly string[] = Object.values(SAVED_WITHIN);

function isSavedWithin(value: string): value is SavedWithin {
  return PERIODS.includes(value);
}

/** The rows of the dialog for a stored query (what the controls show). */
export function rowsOfQuery(query: SavedViewQuery): NewViewRows {
  return {
    where:
      query.scope === SAVED_VIEW_SCOPE.Folder && query.folderId !== null
        ? query.folderId
        : query.scope === SAVED_VIEW_SCOPE.Folder
          ? VIEW_WHERE.All
          : query.scope,
    kind: query.kind ?? ALL_KINDS,
    tags: [...query.tags],
    q: query.q,
    sort: feedSortOf(query),
    saved: query.saved ?? VIEW_SAVED_ANY,
    favorite: query.favorite,
  };
}

/**
 * The stored query of the rows, as the API normalizes it: a `where` that is not one of the three
 * places is a folder id; "All" kinds is no kind (a kind the API stores, `other` too, is kept);
 * tags are normalized, deduplicated and cut to `SAVED_VIEW_LIMIT.TagsMax`; the search is trimmed.
 */
export function queryOfRows(rows: NewViewRows): SavedViewQuery {
  const place = Object.values<string>(VIEW_WHERE).includes(rows.where);
  const normalized = normalizeViewQuery({
    scope: place ? (rows.where as SavedViewQuery['scope']) : SAVED_VIEW_SCOPE.Folder,
    folderId: place ? null : rows.where,
    tags: rows.tags,
    kind: isLinkKind(rows.kind) ? rows.kind : null,
    q: rows.q.slice(0, LINK_LIMIT.QueryMax),
    ...sortFieldsOf(rows.sort),
    saved: isSavedWithin(rows.saved) ? rows.saved : null,
    // On Favorites the place already says it.
    favorite: rows.favorite && rows.where !== VIEW_WHERE.Favorites,
  });
  return { ...normalized, tags: normalized.tags.slice(0, SAVED_VIEW_LIMIT.TagsMax) };
}

const lower = (names: readonly string[]): string[] =>
  names.map((name) => name.toLowerCase()).sort();

/** Whether one row holds the same value in both (tags in any order and case, the search trimmed). */
export function sameRow(field: ViewDraftField, a: NewViewRows, b: NewViewRows): boolean {
  switch (field) {
    case VIEW_DRAFT_FIELD.Scope:
      return a.where === b.where;
    case VIEW_DRAFT_FIELD.Kind:
      return a.kind === b.kind;
    case VIEW_DRAFT_FIELD.Tags:
      return lower(a.tags).join('\n') === lower(b.tags).join('\n');
    case VIEW_DRAFT_FIELD.Q:
      return a.q.trim() === b.q.trim();
    case VIEW_DRAFT_FIELD.Sort:
      return a.sort === b.sort;
  }
}
