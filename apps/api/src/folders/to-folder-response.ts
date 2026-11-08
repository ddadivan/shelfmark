import type { FolderResponse } from '@shelfmark/contracts';
import type { FolderRow } from './models/folder-row.interface';

export function toFolderResponse(row: FolderRow, linkCount: number): FolderResponse {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    linkCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
