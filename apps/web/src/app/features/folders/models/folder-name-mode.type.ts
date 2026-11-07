import type { FOLDER_NAME_MODE } from './folder-name-mode.const';

export type FolderNameMode = (typeof FOLDER_NAME_MODE)[keyof typeof FOLDER_NAME_MODE];
