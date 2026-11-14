import type { FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import {
  buildFolderTree,
  byName,
  descendantIds,
  endPosition,
  pathTo,
  reorderedSiblings,
} from './folder-tree';

function folder(id: string, parentId: string | null): FolderResponse {
  return { ...MOCK_FOLDERS[0], id, parentId, name: id, linkCount: 1 };
}

// a -> b -> c, a -> d, e
const FOLDERS = [
  folder('a', null),
  folder('b', 'a'),
  folder('c', 'b'),
  folder('d', 'a'),
  folder('e', null),
];

describe('folder tree', () => {
  it('nests folders by parent', () => {
    const tree = buildFolderTree(FOLDERS);

    expect(tree.map((node) => node.folder.id)).toEqual(['a', 'e']);
    expect(tree[0].children.map((node) => node.folder.id)).toEqual(['b', 'd']);
    expect(tree[0].children[0].children.map((node) => node.folder.id)).toEqual(['c']);
  });

  it('shows a folder whose parent is missing at the top level', () => {
    expect(buildFolderTree([folder('x', 'gone')]).map((node) => node.folder.id)).toEqual(['x']);
  });

  it('does not loop on a cycle in the data', () => {
    const tree = buildFolderTree([folder('p', 'q'), folder('q', 'p'), folder('r', null)]);

    expect(tree.map((node) => node.folder.id)).toEqual(['r']);
  });

  it('lists every descendant, not the folder itself', () => {
    expect(descendantIds(FOLDERS, 'a')).toEqual(['b', 'd', 'c']);
    expect(descendantIds(FOLDERS, 'c')).toEqual([]);
  });

  it('terminates on a cycle in the data', () => {
    expect(descendantIds([folder('p', 'q'), folder('q', 'p')], 'p')).toEqual(['q']);
  });

  it('gives the path from the top level down', () => {
    expect(pathTo(FOLDERS, 'c').map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(pathTo(FOLDERS, 'nope')).toEqual([]);
  });

  it('sorts by manual position, then name', () => {
    const list = [
      { ...folder('x', null), name: 'b', position: 1 },
      { ...folder('y', null), name: 'z', position: 0 },
      { ...folder('w', null), name: 'a', position: 1 },
    ];

    expect(byName(list).map((item) => item.id)).toEqual(['y', 'w', 'x']);
  });

  it('puts a moved folder after the last sibling of the new parent', () => {
    const list = [
      { ...folder('a', null), position: 0 },
      { ...folder('b', 'a'), position: 4 },
      { ...folder('c', 'a'), position: 7 },
    ];

    expect(endPosition(list, 'a', 'x')).toBe(8);
    expect(endPosition(list, 'a', 'c')).toBe(5);
    expect(endPosition(list, 'b', 'x')).toBe(0);
  });

  it('moves a sibling to a new index without touching the input', () => {
    const list = [folder('a', null), folder('b', null), folder('c', null)];

    expect(reorderedSiblings(list, 0, 2).map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(list.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});
