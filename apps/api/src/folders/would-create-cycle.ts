import type { FolderNode } from './models/folder-node.interface';

/**
 * True when moving `folderId` under `newParentId` would make it its own ancestor: walks up from
 * the new parent over the given rows and meets `folderId` (or loops on corrupt data). A null
 * parent (top level) never cycles.
 */
export function wouldCreateCycle(
  folderId: string,
  newParentId: string | null,
  folders: readonly FolderNode[],
): boolean {
  if (newParentId === null) return false;
  const parentOf = new Map(folders.map((folder) => [folder.id, folder.parentId]));
  const seen = new Set<string>();
  let current: string | null | undefined = newParentId;
  while (current !== null && current !== undefined) {
    if (current === folderId || seen.has(current)) return true;
    seen.add(current);
    current = parentOf.get(current);
  }
  return false;
}
