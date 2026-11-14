import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { LINKS_SCOPE } from '../features/links/models/links-scope.const';
import { insertAt, retagLink, staysAfterEdit } from './links-feed';

function link(changes: Partial<LinkResponse>): LinkResponse {
  return { ...MOCK_LINKS[0], ...changes };
}

describe('staysAfterEdit', () => {
  it('keeps the link in "All" and for any favorite change', () => {
    expect(staysAfterEdit({ scope: LINKS_SCOPE.All }, link({ folderId: 'f' }))).toBe(true);
    expect(staysAfterEdit({ scope: LINKS_SCOPE.Favorites }, link({ isFavorite: false }))).toBe(
      true,
    );
  });

  it('drops a link that left "Unsorted"', () => {
    expect(staysAfterEdit({ scope: LINKS_SCOPE.Unsorted }, link({ folderId: null }))).toBe(true);
    expect(staysAfterEdit({ scope: LINKS_SCOPE.Unsorted }, link({ folderId: 'f' }))).toBe(false);
  });

  it('drops a link that left the open folder', () => {
    const filter = { scope: LINKS_SCOPE.Folder, folderId: 'a' } as const;
    expect(staysAfterEdit(filter, link({ folderId: 'a' }))).toBe(true);
    expect(staysAfterEdit(filter, link({ folderId: 'b' }))).toBe(false);
  });
});

describe('retagLink', () => {
  it('returns the same link when it has no such tag', () => {
    const item = link({ tags: ['a'] });
    expect(retagLink(item, 'b', 'c')).toBe(item);
  });

  it('renames case-insensitively and keeps the order', () => {
    expect(retagLink(link({ tags: ['x', 'Foo', 'y'] }), 'foo', 'bar').tags).toEqual([
      'x',
      'bar',
      'y',
    ]);
  });

  it('collapses a link that already has the new name', () => {
    expect(retagLink(link({ tags: ['foo', 'Bar'] }), 'foo', 'bar').tags).toEqual(['bar']);
  });

  it('drops the tag for null', () => {
    expect(retagLink(link({ tags: ['a', 'b'] }), 'a', null).tags).toEqual(['b']);
  });
});

describe('insertAt', () => {
  it('inserts at the index without changing the list', () => {
    const list = [1, 3];
    expect(insertAt(list, 1, 2)).toEqual([1, 2, 3]);
    expect(list).toEqual([1, 3]);
  });

  it('appends when the index is past the end', () => {
    expect(insertAt([1], 9, 2)).toEqual([1, 2]);
  });
});
