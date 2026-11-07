import type { FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import { buildFolderTree, descendantIds, pathTo } from './folder-tree';

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
});
