import type { FOLDER_STYLE_TAB } from './folder-style-tab.const';

export type FolderStyleTab = (typeof FOLDER_STYLE_TAB)[keyof typeof FOLDER_STYLE_TAB];
