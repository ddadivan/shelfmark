import type { FolderResponse } from '@shelfmark/contracts';

/** A folder with its subfolders: one node of `FoldersStore.tree`. */
export interface FolderNode {
  readonly folder: FolderResponse;
  readonly children: readonly FolderNode[];
}
