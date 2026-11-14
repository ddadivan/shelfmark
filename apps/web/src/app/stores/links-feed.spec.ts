import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { LINKS_SCOPE } from '../features/links/models/links-scope.const';
import { insertAt, placeLink, retagLink, staysAfterEdit } from './links-feed';

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

describe('placeLink', () => {
  const folder = { scope: LINKS_SCOPE.Folder, folderId: 'a' } as const;
  const one = link({ id: '1', folderId: 'a' });
  const two = link({ id: '2', folderId: 'a' });
  const three = link({ id: '3', folderId: 'a' });

  it('replaces a link that still belongs, in place', () => {
    const changed = { ...two, title: 'new' };
    const next = placeLink([one, two, three], folder, changed, new Map());
    expect(next).toEqual([one, changed, three]);
  });

  it('removes a link that left and remembers its slot', () => {
    const slots = new Map<string, number>();
    const next = placeLink([one, two, three], folder, { ...two, folderId: 'b' }, slots);
    expect(next).toEqual([one, three]);
    expect(slots.get('2')).toBe(1);
  });

  it('brings it back at its slot and forgets the slot', () => {
    const slots = new Map([['2', 1]]);
    const next = placeLink([one, three], folder, two, slots);
    expect(next).toEqual([one, two, three]);
    expect(slots.size).toBe(0);
  });

  it('leaves the list alone for a remembered link that no longer belongs', () => {
    const list = [one];
    expect(placeLink(list, folder, { ...two, folderId: 'b' }, new Map([['2', 0]]))).toBe(list);
  });

  it('inserts a link the feed never held after the pinned links of a folder', () => {
    const pinned = link({ id: 'p', folderId: 'a', pinnedInFolderAt: '2026-01-01T00:00:00.000Z' });
    const next = placeLink([pinned, one], folder, two, new Map());
    expect(next.map((item) => item.id)).toEqual(['p', '2', '1']);
  });

  it('inserts into Unsorted, at the top without pinned links', () => {
    const unsorted = { scope: LINKS_SCOPE.Unsorted } as const;
    const next = placeLink([one], unsorted, link({ id: '9', folderId: null }), new Map());
    expect(next.map((item) => item.id)).toEqual(['9', '1']);
  });

  it('does not insert into other scopes or a link of another folder', () => {
    const list = [one];
    expect(placeLink(list, { scope: LINKS_SCOPE.All }, two, new Map())).toBe(list);
    expect(placeLink(list, folder, link({ id: '7', folderId: 'b' }), new Map())).toBe(list);
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
