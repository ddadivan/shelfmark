import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { groupedByFolder, tagCounts, withTagsChanged } from './bulk-link-changes';

function link(id: string, folderId: string | null, tags: string[]): LinkResponse {
  return { ...MOCK_LINKS[0], id, folderId, tags };
}

describe('bulk link changes', () => {
  it('counts the links of each tag', () => {
    const counts = tagCounts([link('1', null, ['a', 'b']), link('2', null, ['a'])]);

    expect([...counts]).toEqual([
      ['a', 2],
      ['b', 1],
    ]);
  });

  it('removes tags in any case and adds only the missing ones', () => {
    const changed = withTagsChanged(link('1', null, ['Angular', 'rxjs']), {
      add: ['RXJS', 'signals'],
      remove: ['angular'],
    });

    expect(changed.tags).toEqual(['rxjs', 'signals']);
  });

  it('groups by the current folder with the target folder applied', () => {
    const groups = groupedByFolder(
      [link('1', 'x', []), link('2', null, []), link('3', 'x', [])],
      'to',
    );

    expect([...groups.keys()]).toEqual(['x', null]);
    expect(groups.get('x')?.map((item) => item.id)).toEqual(['1', '3']);
    expect(groups.get('x')?.every((item) => item.folderId === 'to')).toBe(true);
  });
});
