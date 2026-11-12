import type { FolderResponse } from '@shelfmark/contracts';
import type { SelectOption } from '@shelfmark/ui';

/** Turns the flat folder list into the nested options of `ui-select`; orphans become roots. */
export function buildFolderOptions(folders: readonly FolderResponse[]): SelectOption[] {
  const ids = new Set(folders.map((folder) => folder.id));
  const byParent = new Map<string | null, FolderResponse[]>();
  for (const folder of folders) {
    const parent = folder.parentId !== null && ids.has(folder.parentId) ? folder.parentId : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), folder]);
  }
  const build = (parent: string | null): SelectOption[] =>
    (byParent.get(parent) ?? []).map((folder) => {
      const children = build(folder.id);
      return children.length > 0
        ? { id: folder.id, name: folder.name, children }
        : { id: folder.id, name: folder.name };
    });
  return build(null);
}
