import type { SubtreeFolder } from './subtree-folder.interface';

/** A live share found by its token, with every folder of its subtree (the root first). */
export interface ResolvedShare {
  userId: string;
  folderId: string;
  showNotes: boolean;
  ownerName: string;
  folders: SubtreeFolder[];
}
