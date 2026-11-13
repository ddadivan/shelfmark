import { folderTreeNodes } from './folder-tree-nodes';
import type { FolderNode } from '../../../stores/models/folder-node.interface';

function node(id: string, children: FolderNode[] = []): FolderNode {
  return {
    folder: { id, name: `Folder ${id}`, icon: 'folder', colour: 'blue', linkCount: 4 },
    children,
  } as unknown as FolderNode;
}

describe('folderTreeNodes', () => {
  const tree = [node('a', [node('b')]), node('c')];

  it('maps the tree with counts, colour and open folders', () => {
    const nodes = folderTreeNodes(tree, {
      open: new Set(['a']),
      countsShown: true,
      shownColour: (colour) => `shown-${colour}`,
    });
    expect(nodes).toEqual([
      {
        id: 'a',
        name: 'Folder a',
        count: 4,
        icon: 'folder',
        colour: 'shown-blue',
        expanded: true,
        children: [{ id: 'b', name: 'Folder b', count: 4, icon: 'folder', colour: 'shown-blue' }],
      },
      { id: 'c', name: 'Folder c', count: 4, icon: 'folder', colour: 'shown-blue' },
    ]);
  });

  it('leaves the counts out when they are off', () => {
    const nodes = folderTreeNodes(tree, {
      open: new Set(),
      countsShown: false,
      shownColour: (colour) => colour,
    });
    expect(nodes.some((entry) => 'count' in entry)).toBe(false);
  });
});
