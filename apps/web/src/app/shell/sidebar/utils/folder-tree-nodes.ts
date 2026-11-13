import type { UiTreeNode } from '@shelfmark/ui';
import type { FolderNode } from '../../../stores/models/folder-node.interface';
import type { FolderTreeNodeOptions } from '../models/folder-tree-node-options.interface';

/** The folder tree as `ui-tree` nodes: counts, tile colour and the folders that start open. */
export function folderTreeNodes(
  tree: readonly FolderNode[],
  options: FolderTreeNodeOptions,
): UiTreeNode[] {
  const toNode = ({ folder, children }: FolderNode): UiTreeNode => ({
    id: folder.id,
    name: folder.name,
    ...(options.countsShown && { count: folder.linkCount }),
    icon: folder.icon,
    colour: options.shownColour(folder.colour),
    ...(options.open.has(folder.id) && { expanded: true }),
    ...(children.length > 0 && { children: children.map(toNode) }),
  });
  return tree.map(toNode);
}
