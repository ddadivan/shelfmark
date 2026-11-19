import type { IMPORT_FOLDERS_MODE } from './import-folders-mode.const';

export type ImportFoldersMode = (typeof IMPORT_FOLDERS_MODE)[keyof typeof IMPORT_FOLDERS_MODE];
