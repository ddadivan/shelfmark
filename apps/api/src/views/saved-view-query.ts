import { BadRequestException } from '@nestjs/common';
import {
  LINK_KIND,
  LINK_SORT_FIELD,
  SAVED_VIEW_ERROR_MESSAGE,
  SAVED_VIEW_LIMIT,
  SAVED_VIEW_SCOPE,
  SORT_ORDER,
  type LinkKind,
  type LinkSortField,
  type SavedViewQuery,
  type SavedViewQueryRequest,
  type SavedViewScope,
  type SortOrder,
} from '@shelfmark/contracts';
import { DEFAULT_SAVED_VIEW_QUERY } from './models/default-saved-view-query.const';

function oneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

/**
 * The stored form of a validated request (the DTO already normalized tags and trimmed `q`): every
 * field present, the folder rule enforced. Folder ownership is checked by the service.
 */
export function normalizeSavedViewQuery(request: SavedViewQueryRequest): SavedViewQuery {
  const folderId = request.folderId ?? null;
  if (request.scope === SAVED_VIEW_SCOPE.Folder && folderId === null) {
    throw new BadRequestException(SAVED_VIEW_ERROR_MESSAGE.FolderRequired);
  }
  if (request.scope !== SAVED_VIEW_SCOPE.Folder && folderId !== null) {
    throw new BadRequestException(SAVED_VIEW_ERROR_MESSAGE.FolderNotAllowed);
  }
  return {
    scope: request.scope,
    folderId: folderId?.toLowerCase() ?? null,
    tags: [...(request.tags ?? [])],
    kind: request.kind ?? null,
    sort: request.sort ?? DEFAULT_SAVED_VIEW_QUERY.sort,
    order: request.order ?? DEFAULT_SAVED_VIEW_QUERY.order,
    q: request.q ?? '',
  };
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Reads a stored `query` defensively: every row was written by `normalizeSavedViewQuery` (or the
 * starter trigger), but a malformed field falls back to its default instead of failing the list.
 */
export function parseStoredQuery(value: unknown): SavedViewQuery {
  const raw = record(value);
  const scope: SavedViewScope = oneOf(Object.values(SAVED_VIEW_SCOPE), raw['scope'])
    ? raw['scope']
    : SAVED_VIEW_SCOPE.All;
  const folderId = typeof raw['folderId'] === 'string' ? raw['folderId'] : null;
  const tags = Array.isArray(raw['tags'])
    ? raw['tags']
        .filter((tag): tag is string => typeof tag === 'string')
        .slice(0, SAVED_VIEW_LIMIT.TagsMax)
    : [];
  const kind: LinkKind | null = oneOf(Object.values(LINK_KIND), raw['kind']) ? raw['kind'] : null;
  const sort: LinkSortField = oneOf(Object.values(LINK_SORT_FIELD), raw['sort'])
    ? raw['sort']
    : DEFAULT_SAVED_VIEW_QUERY.sort;
  const order: SortOrder = oneOf(Object.values(SORT_ORDER), raw['order'])
    ? raw['order']
    : DEFAULT_SAVED_VIEW_QUERY.order;
  const q = typeof raw['q'] === 'string' ? raw['q'] : '';
  // A folder view without a folder stays one: it is unavailable and counts 0, never "everything".
  return {
    scope,
    folderId: scope === SAVED_VIEW_SCOPE.Folder ? folderId : null,
    tags,
    kind,
    sort,
    order,
    q,
  };
}
