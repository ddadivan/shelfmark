import type { FolderResponse } from '@shelfmark/contracts';
import type { SelectOption } from '@shelfmark/ui';
import { buildFolderTree } from '../../../stores/folder-tree';
import type { FolderNode } from '../../../stores/models/folder-node.interface';

/**
 * Turns the flat folder list into the nested options of `ui-select`; orphans become roots. With
 * `shownColour` (the account's folder colours) each option carries its folder tile, like the
 * sidebar and the Move to picker (#418). Built on `buildFolderTree`, so a cycle in bad data
 * cannot recurse forever.
 */
export function buildFolderOptions(
  folders: readonly FolderResponse[],
  shownColour?: (colour: string) => string,
): SelectOption[] {
  const toOption = ({ folder, children }: FolderNode): SelectOption => ({
    id: folder.id,
    name: folder.name,
    ...(shownColour && { colour: shownColour(folder.colour), icon: folder.icon }),
    ...(children.length > 0 && { children: children.map(toOption) }),
  });
  return buildFolderTree(folders).map(toOption);
}
