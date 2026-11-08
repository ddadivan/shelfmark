import type { FolderResponse } from '@shelfmark/contracts';
import type { FolderNode } from './models/folder-node.interface';

/** Groups folders by parent; a folder whose parent is not in the list is a root (an orphan never disappears). */
function childrenByParent(
  folders: readonly FolderResponse[],
): Map<string | null, FolderResponse[]> {
  const ids = new Set(folders.map((folder) => folder.id));
  const byParent = new Map<string | null, FolderResponse[]>();
  for (const folder of folders) {
    const parent = folder.parentId !== null && ids.has(folder.parentId) ? folder.parentId : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), folder]);
  }
  return byParent;
}

/** The nested tree of a flat folder list, in list order. */
export function buildFolderTree(folders: readonly FolderResponse[]): FolderNode[] {
  const byParent = childrenByParent(folders);
  const seen = new Set<string>();
  const build = (parent: string | null): FolderNode[] =>
    (byParent.get(parent) ?? [])
      // A cycle in bad data must not recurse forever.
      .filter((folder) => !seen.has(folder.id) && !!seen.add(folder.id))
      .map((folder) => ({ folder, children: build(folder.id) }));
  return build(null);
}

/** Ids of every folder below `id` (not `id` itself), parents before children. */
export function descendantIds(folders: readonly FolderResponse[], id: string): string[] {
  const byParent = childrenByParent(folders);
  const found: string[] = [];
  const queue = [id];
  for (const current of queue) {
    for (const child of byParent.get(current) ?? []) {
      if (child.id !== id && !found.includes(child.id)) {
        found.push(child.id);
        queue.push(child.id);
      }
    }
  }
  return found;
}

/** The folders from the top level down to `id`, `id` last; empty for an unknown id. */
export function pathTo(folders: readonly FolderResponse[], id: string): FolderResponse[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: FolderResponse[] = [];
  let current = byId.get(id);
  while (current && !path.includes(current)) {
    path.unshift(current);
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return path;
}
