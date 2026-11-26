import { BadRequestException } from '@nestjs/common';
import {
  LINK_ERROR_MESSAGE,
  LINK_SORT_FIELD,
  PAGE_LIMIT,
  SORT_ORDER,
  hasControlChars,
  type LinkSortField,
  type SortOrder,
} from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';
import { isRecord } from '../common/util/is-record';
import { LINK_CURSOR_VERSION } from './models/link-cursor-version.const';
import type { CursorKeys } from './models/cursor-keys.interface';
import type { CursorRow } from './models/cursor-row.interface';
import type { LinkCursor } from './models/link-cursor.interface';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opaque cursor text: base64url of the JSON `{v, s, o, k, k2?, id}`. */
export function encodeCursor(cursor: LinkCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function invalid(): BadRequestException {
  return new BadRequestException(LINK_ERROR_MESSAGE.InvalidCursor);
}

function isSortField(value: unknown): value is LinkSortField {
  return Object.values<unknown>(LINK_SORT_FIELD).includes(value);
}

function isSortOrder(value: unknown): value is SortOrder {
  return Object.values<unknown>(SORT_ORDER).includes(value);
}

/**
 * Decodes and checks a cursor. Malformed text, another version, or a cursor issued for a different
 * sort field or order than the request asks for is a 400: a cursor only continues the list it
 * came from.
 */
export function decodeCursor(raw: string, sort: LinkSortField, order: SortOrder): LinkCursor {
  if (raw.length > PAGE_LIMIT.CursorMax) throw invalid();
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw invalid();
  }
  if (!isRecord(parsed)) throw invalid();
  const { v, s, o, k, id } = parsed;
  if (v !== LINK_CURSOR_VERSION || !isSortField(s) || !isSortOrder(o)) throw invalid();
  if (s !== sort || o !== order) throw invalid();
  if (typeof id !== 'string' || !UUID.test(id)) throw invalid();
  const k2 = parsed['k2'];
  const keys = cursorKeysOf(s, k, k2);
  return { v, s, o, ...keys, id };
}

function isIsoTime(text: string): boolean {
  const time = new Date(text);
  return !Number.isNaN(time.getTime()) && time.toISOString() === text;
}

function isPlainText(value: unknown): value is string {
  return typeof value === 'string' && !hasControlChars(value);
}

/** The key fields a sort needs, checked: a wrong shape for the sort is a 400. */
function cursorKeysOf(sort: LinkSortField, k: unknown, k2: unknown): CursorKeys {
  switch (sort) {
    case LINK_SORT_FIELD.CreatedAt:
    case LINK_SORT_FIELD.UpdatedAt:
      if (typeof k !== 'string' || !isIsoTime(k) || k2 !== undefined) throw invalid();
      return { k };
    case LINK_SORT_FIELD.LastOpenedAt:
      // null = a never-opened link: the cursor is already in the tail of the list.
      if ((k !== null && (typeof k !== 'string' || !isIsoTime(k))) || k2 !== undefined) {
        throw invalid();
      }
      return { k };
    case LINK_SORT_FIELD.Host:
      if (!isPlainText(k) || !isPlainText(k2)) throw invalid();
      return { k, k2 };
    case LINK_SORT_FIELD.Favorite:
      if ((k !== '1' && k !== '0') || typeof k2 !== 'string' || !isIsoTime(k2)) throw invalid();
      return { k, k2 };
    default:
      if (!isPlainText(k) || k2 !== undefined) throw invalid();
      return { k };
  }
}

/** The sort keys stored in the cursor for a row. */
export function cursorKeys(sort: LinkSortField, row: CursorRow): CursorKeys {
  switch (sort) {
    case LINK_SORT_FIELD.CreatedAt:
      return { k: row.createdAt.toISOString() };
    case LINK_SORT_FIELD.UpdatedAt:
      return { k: row.updatedAt.toISOString() };
    case LINK_SORT_FIELD.LastOpenedAt:
      return { k: row.lastOpenedAt?.toISOString() ?? null };
    case LINK_SORT_FIELD.Host:
      return { k: row.host, k2: row.titleSortKey };
    case LINK_SORT_FIELD.Favorite:
      return { k: row.isFavorite ? '1' : '0', k2: row.createdAt.toISOString() };
    default:
      return { k: row.titleSortKey };
  }
}

/**
 * `ORDER BY` for a sort field and order; `id` breaks ties in the same direction. Never-opened
 * links come last in both directions of `lastOpenedAt`.
 */
export function linkOrderBy(
  sort: LinkSortField,
  order: SortOrder,
): Prisma.LinkOrderByWithRelationInput[] {
  switch (sort) {
    case LINK_SORT_FIELD.CreatedAt:
      return [{ createdAt: order }, { id: order }];
    case LINK_SORT_FIELD.UpdatedAt:
      return [{ updatedAt: order }, { id: order }];
    case LINK_SORT_FIELD.LastOpenedAt:
      return [{ lastOpenedAt: { sort: order, nulls: 'last' } }, { id: order }];
    case LINK_SORT_FIELD.Host:
      return [{ host: order }, { titleSortKey: order }, { id: order }];
    case LINK_SORT_FIELD.Favorite:
      return [{ isFavorite: order }, { createdAt: order }, { id: order }];
    default:
      return [{ titleSortKey: order }, { id: order }];
  }
}

/** Rows strictly after the cursor row in the list order: `(key, id) > or < (cursorKey, cursorId)`. */
export function cursorWhere(cursor: LinkCursor): Prisma.LinkWhereInput {
  const after = cursor.o === SORT_ORDER.Asc ? 'gt' : 'lt';
  const { id } = cursor;
  switch (cursor.s) {
    case LINK_SORT_FIELD.CreatedAt:
    case LINK_SORT_FIELD.UpdatedAt: {
      const field = cursor.s;
      const key = new Date(cursor.k ?? '');
      return { OR: [{ [field]: { [after]: key } }, { [field]: key, id: { [after]: id } }] };
    }
    case LINK_SORT_FIELD.LastOpenedAt: {
      if (cursor.k === null) return { lastOpenedAt: null, id: { [after]: id } };
      const key = new Date(cursor.k);
      return {
        OR: [
          { lastOpenedAt: { [after]: key } },
          { lastOpenedAt: key, id: { [after]: id } },
          { lastOpenedAt: null },
        ],
      };
    }
    case LINK_SORT_FIELD.Host: {
      const host = cursor.k ?? '';
      const title = cursor.k2 ?? '';
      return {
        OR: [
          { host: { [after]: host } },
          { host, titleSortKey: { [after]: title } },
          { host, titleSortKey: title, id: { [after]: id } },
        ],
      };
    }
    case LINK_SORT_FIELD.Favorite: {
      const favorite = cursor.k === '1';
      const created = new Date(cursor.k2 ?? '');
      // `false` sorts before `true`: the other group is "after" when going up from false or down from true.
      const otherGroupAfter = after === 'lt' ? favorite : !favorite;
      return {
        OR: [
          ...(otherGroupAfter ? [{ isFavorite: !favorite }] : []),
          { isFavorite: favorite, createdAt: { [after]: created } },
          { isFavorite: favorite, createdAt: created, id: { [after]: id } },
        ],
      };
    }
    default:
      return {
        OR: [
          { titleSortKey: { [after]: cursor.k ?? '' } },
          { titleSortKey: cursor.k ?? '', id: { [after]: id } },
        ],
      };
  }
}
