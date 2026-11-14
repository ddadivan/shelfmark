import type { FOLDER_ICON } from './folder-icon.const';

/** One of `FOLDER_ICON`. */
export type FolderIcon = (typeof FOLDER_ICON)[keyof typeof FOLDER_ICON];
