import type { FOLDER_DELETE_MODE } from './folder-delete-mode.const';

export type FolderDeleteMode = (typeof FOLDER_DELETE_MODE)[keyof typeof FOLDER_DELETE_MODE];
