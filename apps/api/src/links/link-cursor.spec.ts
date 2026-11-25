import { BadRequestException } from '@nestjs/common';
import { LINK_SORT_FIELD, PAGE_LIMIT, SORT_ORDER } from '@shelfmark/contracts';
import { describe, expect, it } from 'vitest';
import { cursorKeys, cursorWhere, decodeCursor, encodeCursor, linkOrderBy } from './link-cursor';
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
    const row = {
      createdAt: WHEN,
      updatedAt: new Date('2026-11-08T10:00:00.000Z'),
      lastOpenedAt: null,
      titleSortKey: 'abc',
      host: 'example.com',
      isFavorite: true,
    };
    expect(cursorKeys(LINK_SORT_FIELD.CreatedAt, row)).toEqual({ k: WHEN.toISOString() });
    expect(cursorKeys(LINK_SORT_FIELD.Title, row)).toEqual({ k: 'abc' });
    expect(cursorKeys(LINK_SORT_FIELD.UpdatedAt, row)).toEqual({ k: '2026-11-08T10:00:00.000Z' });
    expect(cursorKeys(LINK_SORT_FIELD.LastOpenedAt, row)).toEqual({ k: null });
    expect(cursorKeys(LINK_SORT_FIELD.LastOpenedAt, { ...row, lastOpenedAt: WHEN })).toEqual({
      k: WHEN.toISOString(),
    });
    expect(cursorKeys(LINK_SORT_FIELD.Host, row)).toEqual({ k: 'example.com', k2: 'abc' });
    expect(cursorKeys(LINK_SORT_FIELD.Favorite, row)).toEqual({
      k: '1',
      k2: WHEN.toISOString(),
    });
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

  it('pages a Z to A title list downwards (the web "Title Z–A")', () => {
    const desc: LinkCursor = { ...created, s: LINK_SORT_FIELD.Title, o: SORT_ORDER.Desc, k: 'b' };
    expect(decodeCursor(encodeCursor(desc), LINK_SORT_FIELD.Title, SORT_ORDER.Desc)).toEqual(desc);
    expect(cursorWhere(desc)).toEqual({
      OR: [{ titleSortKey: { lt: 'b' } }, { titleSortKey: 'b', id: { lt: ID } }],
    });
    expect(linkOrderBy(LINK_SORT_FIELD.Title, SORT_ORDER.Desc)).toEqual([
      { titleSortKey: 'desc' },
      { id: 'desc' },
    ]);
  });

  describe('the newer sorts', () => {
    const opened: LinkCursor = { ...created, s: LINK_SORT_FIELD.LastOpenedAt };
    const host: LinkCursor = { ...created, s: LINK_SORT_FIELD.Host, k: 'a.com', k2: 'title' };
    const favorite: LinkCursor = {
      ...created,
      s: LINK_SORT_FIELD.Favorite,
      k: '1',
      k2: WHEN.toISOString(),
    };

    it('round-trips each of them, a never-opened key included', () => {
      for (const cursor of [
        opened,
        { ...opened, k: null },
        host,
        favorite,
        { ...created, s: LINK_SORT_FIELD.UpdatedAt },
      ]) {
        expect(decodeCursor(encodeCursor(cursor), cursor.s, SORT_ORDER.Desc)).toEqual(cursor);
      }
    });

    it.each([
      ['a null key outside lastOpenedAt', raw({ ...created, k: null })],
      ['a second key where none belongs', raw({ ...created, k2: 'x' })],
      ['host without a title key', raw({ ...host, k2: undefined })],
      ['favorite with a bad flag', raw({ ...favorite, k: 'yes' })],
      ['favorite with a bad time', raw({ ...favorite, k2: 'later' })],
      ['lastOpenedAt with a bad time', raw({ ...opened, k: 'soon' })],
    ])('rejects %s', (_name, text) => {
      const sorts = [created.s, host.s, favorite.s, opened.s];
      const accepted = sorts.filter((sort) => {
        try {
          decodeCursor(text, sort, SORT_ORDER.Desc);
          return true;
        } catch {
          return false;
        }
      });
      // The text is only valid for the sort it names, and none of these are valid at all.
      expect(accepted).toEqual([]);
    });

    it('orders never-opened links last in both directions, then by id', () => {
      for (const order of [SORT_ORDER.Asc, SORT_ORDER.Desc]) {
        expect(linkOrderBy(LINK_SORT_FIELD.LastOpenedAt, order)).toEqual([
          { lastOpenedAt: { sort: order, nulls: 'last' } },
          { id: order },
        ]);
      }
      expect(linkOrderBy(LINK_SORT_FIELD.Host, SORT_ORDER.Asc)).toEqual([
        { host: 'asc' },
        { titleSortKey: 'asc' },
        { id: 'asc' },
      ]);
      expect(linkOrderBy(LINK_SORT_FIELD.Favorite, SORT_ORDER.Desc)).toEqual([
        { isFavorite: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ]);
    });

    it('continues a lastOpenedAt list into the never-opened tail', () => {
      expect(cursorWhere(opened)).toEqual({
        OR: [
          { lastOpenedAt: { lt: WHEN } },
          { lastOpenedAt: WHEN, id: { lt: ID } },
          { lastOpenedAt: null },
        ],
      });
      expect(cursorWhere({ ...opened, k: null })).toEqual({
        lastOpenedAt: null,
        id: { lt: ID },
      });
    });

    it('continues a favourites-first list from favourites into the others', () => {
      expect(cursorWhere(favorite)).toEqual({
        OR: [
          { isFavorite: false },
          { isFavorite: true, createdAt: { lt: WHEN } },
          { isFavorite: true, createdAt: WHEN, id: { lt: ID } },
        ],
      });
      expect(cursorWhere({ ...favorite, k: '0' }).OR).toHaveLength(2);
    });

    it('continues a site list by host, then title, then id', () => {
      expect(cursorWhere({ ...host, o: SORT_ORDER.Asc })).toEqual({
        OR: [
          { host: { gt: 'a.com' } },
          { host: 'a.com', titleSortKey: { gt: 'title' } },
          { host: 'a.com', titleSortKey: 'title', id: { gt: ID } },
        ],
      });
    });
  });
});
