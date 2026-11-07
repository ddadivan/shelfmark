import type { FolderResponse } from '@shelfmark/contracts';

interface FolderRow {
  id: string;
  parentId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

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
