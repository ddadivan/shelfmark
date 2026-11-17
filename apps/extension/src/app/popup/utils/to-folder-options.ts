import type { FolderResponse } from '@shelfmark/contracts';
import type { PickerOption } from '@shelfmark/ui';

const bySidebarOrder = (a: FolderResponse, b: FolderResponse): number =>
  a.position - b.position || a.name.localeCompare(b.name);

/**
 * The folder tree as `ui-picker-list` options, siblings in the sidebar order, each folder with its
 * icon and colour. A folder whose parent is missing becomes a root; a cycle in bad data is cut.
 */
export function toFolderOptions(folders: readonly FolderResponse[]): PickerOption[] {
  const ids = new Set(folders.map((folder) => folder.id));
  const byParent = new Map<string | null, FolderResponse[]>();
  for (const folder of [...folders].sort(bySidebarOrder)) {
    const parent = folder.parentId !== null && ids.has(folder.parentId) ? folder.parentId : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), folder]);
  }
  const seen = new Set<string>();
  const build = (parent: string | null): PickerOption[] =>
    (byParent.get(parent) ?? [])
      .filter((folder) => !seen.has(folder.id) && !!seen.add(folder.id))
      .map((folder) => {
        const children = build(folder.id);
        return {
          id: folder.id,
          name: folder.name,
          icon: folder.icon,
          colour: folder.colour,
          ...(children.length > 0 && { children }),
        };
      });
  return build(null);
}
