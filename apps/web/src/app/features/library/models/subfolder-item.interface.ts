import type { FolderResponse } from '@shelfmark/contracts';

/** A subfolder tile of a folder view: the folder and the number of folders directly inside it. */
export interface SubfolderItem {
  folder: FolderResponse;
  childCount: number;
}
