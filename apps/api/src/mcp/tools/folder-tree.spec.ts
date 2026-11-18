import { buildFolderTree } from './folder-tree';

describe('buildFolderTree', () => {
  it('orders depth first and builds paths', () => {
    expect(
      buildFolderTree([
        { id: 'a', name: 'A', parentId: null },
        { id: 'b', name: 'B', parentId: null },
        { id: 'a1', name: 'A1', parentId: 'a' },
        { id: 'a1x', name: 'X', parentId: 'a1' },
      ]).map((node) => [node.id, node.path]),
    ).toEqual([
      ['a', 'A'],
      ['a1', 'A / A1'],
      ['a1x', 'A / A1 / X'],
      ['b', 'B'],
    ]);
  });

  it('starts a branch for a folder whose parent is not live', () => {
    expect(buildFolderTree([{ id: 'c', name: 'C', parentId: 'trashed' }])).toEqual([
      { id: 'c', name: 'C', parentId: 'trashed', path: 'C' },
    ]);
  });
});
