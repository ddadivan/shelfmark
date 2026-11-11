import type { FolderShareResponse } from '@shelfmark/contracts';
import type { ShareRow } from './models/share-row.interface';

/** The owner's view of a folder's public link; `null` = the folder is not shared. */
export function toFolderShareResponse(folderId: string, row: ShareRow | null): FolderShareResponse {
  if (row === null) {
    return { folderId, enabled: false, token: null, showNotes: false, createdAt: null };
  }
  return {
    folderId,
    enabled: true,
    token: row.token,
    showNotes: row.showNotes,
    createdAt: row.tokenCreatedAt.toISOString(),
  };
}
