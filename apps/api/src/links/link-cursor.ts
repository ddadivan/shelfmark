import { BadRequestException } from '@nestjs/common';
import {
  LINK_SORT_FIELD,
  PAGE_LIMIT,
  SORT_ORDER,
  type LinkSortField,
  type SortOrder,
} from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';
import { isRecord } from '../common/util/is-record';
import { LINK_ERROR_MESSAGE } from './models/link-error-message.const';
import { LINK_CURSOR_VERSION } from './models/link-cursor-version.const';
import type { LinkCursor } from './models/link-cursor.interface';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opaque cursor text: base64url of the JSON `{v, s, o, k, id}`. */
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
  if (typeof k !== 'string' || typeof id !== 'string' || !UUID.test(id)) throw invalid();
  if (s === LINK_SORT_FIELD.CreatedAt) {
    const time = new Date(k);
    if (Number.isNaN(time.getTime()) || time.toISOString() !== k) throw invalid();
  }
  return { v, s, o, k, id };
}

/** The sort key stored in the cursor for a row. */
export function cursorKey(
  sort: LinkSortField,
  row: { createdAt: Date; titleSortKey: string },
): string {
  return sort === LINK_SORT_FIELD.CreatedAt ? row.createdAt.toISOString() : row.titleSortKey;
}

/** `ORDER BY` for a sort field and order; `id` breaks ties in the same direction. */
export function linkOrderBy(
  sort: LinkSortField,
  order: SortOrder,
): Prisma.LinkOrderByWithRelationInput[] {
  return sort === LINK_SORT_FIELD.CreatedAt
    ? [{ createdAt: order }, { id: order }]
    : [{ titleSortKey: order }, { id: order }];
}

/** Rows strictly after the cursor row in the list order: `(key, id) > or < (cursorKey, cursorId)`. */
export function cursorWhere(cursor: LinkCursor): Prisma.LinkWhereInput {
  const after = cursor.o === SORT_ORDER.Asc ? 'gt' : 'lt';
  if (cursor.s === LINK_SORT_FIELD.CreatedAt) {
    const key = new Date(cursor.k);
    return {
      OR: [{ createdAt: { [after]: key } }, { createdAt: key, id: { [after]: cursor.id } }],
    };
  }
  return {
    OR: [
      { titleSortKey: { [after]: cursor.k } },
      { titleSortKey: cursor.k, id: { [after]: cursor.id } },
    ],
  };
}
