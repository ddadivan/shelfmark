import { BadRequestException } from '@nestjs/common';
import { LINK_SORT_FIELD, PAGE_LIMIT, SORT_ORDER } from '@shelfmark/contracts';
import { describe, expect, it } from 'vitest';
import { cursorKey, cursorWhere, decodeCursor, encodeCursor, linkOrderBy } from './link-cursor';
import type { LinkCursor } from './models/link-cursor.interface';

const ID = '018f0000-0000-7000-8000-000000000001';
const WHEN = new Date('2026-11-07T10:00:00.123Z');

const created: LinkCursor = {
  v: 1,
  s: LINK_SORT_FIELD.CreatedAt,
  o: SORT_ORDER.Desc,
  k: WHEN.toISOString(),
  id: ID,
};

function raw(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

describe('link cursor', () => {
  it('round-trips', () => {
    const text = encodeCursor(created);
    expect(decodeCursor(text, LINK_SORT_FIELD.CreatedAt, SORT_ORDER.Desc)).toEqual(created);
    const title: LinkCursor = { ...created, s: LINK_SORT_FIELD.Title, o: SORT_ORDER.Asc, k: 'ünï' };
    expect(decodeCursor(encodeCursor(title), LINK_SORT_FIELD.Title, SORT_ORDER.Asc)).toEqual(title);
  });

  it.each([
    ['not base64 json', '!!!'],
    ['not an object', raw('x')],
    ['a null', raw(null)],
    ['wrong version', raw({ ...created, v: 2 })],
    ['unknown sort', raw({ ...created, s: 'url' })],
    ['unknown order', raw({ ...created, o: 'up' })],
    ['key not a string', raw({ ...created, k: 5 })],
    ['id not a uuid', raw({ ...created, id: 'abc' })],
    ['timestamp not iso', raw({ ...created, k: 'yesterday' })],
    ['too long', 'a'.repeat(PAGE_LIMIT.CursorMax + 1)],
  ])('rejects %s', (_name, text) => {
    expect(() => decodeCursor(text, LINK_SORT_FIELD.CreatedAt, SORT_ORDER.Desc)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a cursor issued for another sort or order', () => {
    const text = encodeCursor(created);
    expect(() => decodeCursor(text, LINK_SORT_FIELD.Title, SORT_ORDER.Desc)).toThrow(
      BadRequestException,
    );
    expect(() => decodeCursor(text, LINK_SORT_FIELD.CreatedAt, SORT_ORDER.Asc)).toThrow(
      BadRequestException,
    );
  });

  it('takes the key of a row by sort field', () => {
    const row = { createdAt: WHEN, titleSortKey: 'abc' };
    expect(cursorKey(LINK_SORT_FIELD.CreatedAt, row)).toBe(WHEN.toISOString());
    expect(cursorKey(LINK_SORT_FIELD.Title, row)).toBe('abc');
  });

  it('orders by the key and then by id in the same direction', () => {
    expect(linkOrderBy(LINK_SORT_FIELD.CreatedAt, SORT_ORDER.Desc)).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(linkOrderBy(LINK_SORT_FIELD.Title, SORT_ORDER.Asc)).toEqual([
      { titleSortKey: 'asc' },
      { id: 'asc' },
    ]);
  });

  it('continues after the cursor row', () => {
    expect(cursorWhere(created)).toEqual({
      OR: [{ createdAt: { lt: WHEN } }, { createdAt: WHEN, id: { lt: ID } }],
    });
    expect(
      cursorWhere({ ...created, s: LINK_SORT_FIELD.Title, o: SORT_ORDER.Asc, k: 'b' }),
    ).toEqual({ OR: [{ titleSortKey: { gt: 'b' } }, { titleSortKey: 'b', id: { gt: ID } }] });
  });
});
