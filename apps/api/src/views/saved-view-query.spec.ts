import { BadRequestException } from '@nestjs/common';
import { DEFAULT_SAVED_VIEW_QUERY } from './models/default-saved-view-query.const';
import { normalizeSavedViewQuery, parseStoredQuery } from './saved-view-query';

const FOLDER = '0193a3a0-0000-7000-8000-000000000001';

describe('normalizeSavedViewQuery', () => {
  it('fills every absent field with its default', () => {
    expect(normalizeSavedViewQuery({ scope: 'all' })).toEqual(DEFAULT_SAVED_VIEW_QUERY);
  });

  it('keeps the given values and lower-cases the folder id', () => {
    expect(
      normalizeSavedViewQuery({
        scope: 'folder',
        folderId: FOLDER.toUpperCase(),
        tags: ['a'],
        kind: 'video',
        sort: 'title',
        order: 'asc',
        q: 'x',
        saved: 'week',
        favorite: true,
      }),
    ).toEqual({
      scope: 'folder',
      folderId: FOLDER,
      tags: ['a'],
      kind: 'video',
      sort: 'title',
      order: 'asc',
      q: 'x',
      saved: 'week',
      favorite: true,
    });
  });

  it('needs a folder for the folder scope and refuses one for any other', () => {
    expect(() => normalizeSavedViewQuery({ scope: 'folder' })).toThrow(BadRequestException);
    expect(() => normalizeSavedViewQuery({ scope: 'folder', folderId: null })).toThrow(
      BadRequestException,
    );
    expect(() => normalizeSavedViewQuery({ scope: 'favorites', folderId: FOLDER })).toThrow(
      BadRequestException,
    );
  });
});

describe('parseStoredQuery', () => {
  it('reads a stored query as it is', () => {
    const stored = {
      ...DEFAULT_SAVED_VIEW_QUERY,
      scope: 'folder',
      folderId: FOLDER,
      kind: 'article',
    };
    expect(parseStoredQuery(stored)).toEqual(stored);
    const shelf = { ...DEFAULT_SAVED_VIEW_QUERY, saved: 'month', favorite: true };
    expect(parseStoredQuery(shelf)).toEqual(shelf);
  });

  it('reads a view stored before the period and favorites fields as any time, any link', () => {
    const old: Record<string, unknown> = { ...DEFAULT_SAVED_VIEW_QUERY };
    delete old['saved'];
    delete old['favorite'];
    expect(parseStoredQuery(old)).toEqual(DEFAULT_SAVED_VIEW_QUERY);
  });

  it('falls back to the defaults for anything malformed', () => {
    expect(parseStoredQuery(null)).toEqual(DEFAULT_SAVED_VIEW_QUERY);
    expect(parseStoredQuery([1, 2])).toEqual(DEFAULT_SAVED_VIEW_QUERY);
    expect(
      parseStoredQuery({
        scope: 'x',
        folderId: 3,
        tags: ['a', 1, 'b', 'c', 'd', 'e', 'f'],
        kind: 'sticker',
        sort: 'url',
        order: 'up',
        q: 5,
      }),
    ).toEqual({ ...DEFAULT_SAVED_VIEW_QUERY, tags: ['a', 'b', 'c', 'd', 'e'] });
    expect(parseStoredQuery({ scope: 'all', tags: 'a' }).tags).toEqual([]);
    expect(parseStoredQuery({ scope: 'all', saved: 'year', favorite: 'yes' })).toEqual(
      DEFAULT_SAVED_VIEW_QUERY,
    );
  });

  it('drops a folder id outside the folder scope and keeps a folder view without one', () => {
    expect(parseStoredQuery({ scope: 'all', folderId: FOLDER }).folderId).toBeNull();
    expect(parseStoredQuery({ scope: 'folder' })).toMatchObject({
      scope: 'folder',
      folderId: null,
    });
  });
});
