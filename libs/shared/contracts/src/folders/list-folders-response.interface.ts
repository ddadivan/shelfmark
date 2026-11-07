import type { FolderResponse } from './folder-response.interface';

/** `GET /api/folders` response: all folders as a flat list. */
export interface ListFoldersResponse {
  items: FolderResponse[];
}
