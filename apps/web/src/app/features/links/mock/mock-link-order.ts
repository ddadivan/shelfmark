import {
  LINK_SORT_FIELD,
  linkSiteKey,
  linkTitleSortKey,
  PAGE_LIMIT,
  SORT_ORDER,
  type LinkResponse,
  type LinkSortField,
  type ListLinksQuery,
  type SortOrder,
} from '@shelfmark/contracts';
import type { MockLinkCursor } from '../models/mock-link-cursor.interface';
import type { MockLinkKeys } from '../models/mock-link-keys.interface';

/**
 * The list order of `GET /api/links` for the mock: the sort keys, then the id, both in the
 * requested direction. Title uses `linkTitleSortKey` like the API; Postgres collation of the
 * stored key may still differ from this plain code-unit comparison (not emulated).
 */
export function sortField(query: ListLinksQuery): LinkSortField {
  return query.sort ?? LINK_SORT_FIELD.CreatedAt;
}

export function sortOrder(query: ListLinksQuery): SortOrder {
  return query.order ?? SORT_ORDER.Desc;
}

function keysOf(link: LinkResponse, field: LinkSortField): MockLinkKeys {
  switch (field) {
    case LINK_SORT_FIELD.CreatedAt:
      return { k: link.createdAt };
    case LINK_SORT_FIELD.UpdatedAt:
      return { k: link.updatedAt };
    case LINK_SORT_FIELD.LastOpenedAt:
      return { k: link.lastOpenedAt };
    case LINK_SORT_FIELD.Host:
      return { k: linkSiteKey(link.url), k2: linkTitleSortKey(link.title) };
    case LINK_SORT_FIELD.Favorite:
      return { k: link.isFavorite ? '1' : '0', k2: link.createdAt };
    default:
      return { k: linkTitleSortKey(link.title) };
  }
}

function text(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Position of one row against another in the list: negative when `a` comes first. */
function compareRows(
  a: MockLinkKeys & { id: string },
  b: MockLinkKeys & { id: string },
  field: LinkSortField,
  order: SortOrder,
): number {
  const direction = order === SORT_ORDER.Desc ? -1 : 1;
  if (field === LINK_SORT_FIELD.LastOpenedAt && (a.k === null || b.k === null)) {
    // Like the API: never-opened links come last in both directions, in id order.
    if (a.k === null && b.k === null) return direction * text(a.id, b.id);
    return a.k === null ? 1 : -1;
  }
  return (
    direction * (text(a.k ?? '', b.k ?? '') || text(a.k2 ?? '', b.k2 ?? '') || text(a.id, b.id))
  );
}

export function sortLinks(links: readonly LinkResponse[], query: ListLinksQuery): LinkResponse[] {
  const field = sortField(query);
  const order = sortOrder(query);
  return links
    .map((link) => ({ link, row: { ...keysOf(link, field), id: link.id } }))
    .sort((a, b) => compareRows(a.row, b.row, field, order))
    .map(({ link }) => link);
}

/** The links of an already sorted list that come strictly after the cursor's row. */
export function linksAfter(
  sorted: readonly LinkResponse[],
  cursor: MockLinkCursor,
): readonly LinkResponse[] {
  const index = sorted.findIndex(
    (link) =>
      compareRows({ ...keysOf(link, cursor.s), id: link.id }, cursor, cursor.s, cursor.o) > 0,
  );
  return index < 0 ? [] : sorted.slice(index);
}

export function encodeCursor(link: LinkResponse, field: LinkSortField, order: SortOrder): string {
  const cursor: MockLinkCursor = { s: field, o: order, id: link.id, ...keysOf(link, field) };
  const bytes = new TextEncoder().encode(JSON.stringify(cursor));
  return globalThis.btoa(String.fromCharCode(...bytes));
}

function isSortField(value: unknown): value is LinkSortField {
  return Object.values<unknown>(LINK_SORT_FIELD).includes(value);
}

function isSortOrder(value: unknown): value is SortOrder {
  return Object.values<unknown>(SORT_ORDER).includes(value);
}

/**
 * The cursor, or `null` for the API's 400: not one of ours, too long, or issued for another sort
 * field or order than this request asks for.
 */
export function decodeCursor(
  raw: string,
  field: LinkSortField,
  order: SortOrder,
): MockLinkCursor | null {
  if (raw.length > PAGE_LIMIT.CursorMax) return null;
  try {
    const bytes = Uint8Array.from(globalThis.atob(raw), (char) => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { s, o, k, k2, id } = parsed as Record<string, unknown>;
    if (!isSortField(s) || !isSortOrder(o) || s !== field || o !== order) return null;
    if (typeof id !== 'string' || (k !== null && typeof k !== 'string')) return null;
    if (k2 !== undefined && typeof k2 !== 'string') return null;
    return { s, o, id, k, ...(k2 === undefined ? {} : { k2 }) };
  } catch {
    return null;
  }
}
