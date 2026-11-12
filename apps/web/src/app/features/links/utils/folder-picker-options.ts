import type { PickerOption } from '@shelfmark/ui';
import type { FolderColour, FolderResponse } from '@shelfmark/contracts';
import { buildFolderTree } from '../../../stores/folder-tree';
import type { FolderNode } from '../../../stores/models/folder-node.interface';

/**
 * The folder tree as the nested options of `ui-picker-list`: the folder's icon and colour as in
 * the sidebar (`shownColour` applies the account's "Folder colours" setting); orphans become roots.
 */
export function buildFolderPickerOptions(
  folders: readonly FolderResponse[],
  shownColour: (colour: FolderColour) => FolderColour,
): PickerOption[] {
  const toOption = ({ folder, children }: FolderNode): PickerOption => ({
    id: folder.id,
    name: folder.name,
    icon: folder.icon,
    colour: shownColour(folder.colour),
    ...(children.length > 0 && { children: children.map(toOption) }),
  });
  return buildFolderTree(folders).map(toOption);
}
