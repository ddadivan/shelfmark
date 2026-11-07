import type { FolderDeleteMode } from './folder-delete-mode.type';

/** `DELETE /api/folders/:id` query; subfolders are always deleted. */
export interface DeleteFolderQuery {
  mode: FolderDeleteMode;
}
