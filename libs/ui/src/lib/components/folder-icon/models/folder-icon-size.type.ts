import type { FOLDER_ICON_SIZE } from './folder-icon-size.const';

export type FolderIconSize = (typeof FOLDER_ICON_SIZE)[keyof typeof FOLDER_ICON_SIZE];
