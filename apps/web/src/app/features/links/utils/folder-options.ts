import type { FolderResponse } from '@shelfmark/contracts';
import type { SelectOption } from '@shelfmark/ui';

/**
 * Turns the flat folder list into the nested options of `ui-select`; orphans become roots. With
 * `shownColour` (the account's folder colours) each option carries its folder tile, like the
 * sidebar and the Move to picker (#418).
 */
export function buildFolderOptions(
  folders: readonly FolderResponse[],
  shownColour?: (colour: string) => string,
): SelectOption[] {
  const ids = new Set(folders.map((folder) => folder.id));
  const byParent = new Map<string | null, FolderResponse[]>();
  for (const folder of folders) {
    const parent = folder.parentId !== null && ids.has(folder.parentId) ? folder.parentId : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), folder]);
  }
  const build = (parent: string | null): SelectOption[] =>
    (byParent.get(parent) ?? []).map((folder) => {
      const children = build(folder.id);
      return {
        id: folder.id,
        name: folder.name,
        ...(shownColour && { colour: shownColour(folder.colour), icon: folder.icon }),
        ...(children.length > 0 && { children }),
      };
    });
  return build(null);
}
