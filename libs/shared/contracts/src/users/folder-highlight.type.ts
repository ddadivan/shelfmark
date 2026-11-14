import type { FOLDER_HIGHLIGHT } from './folder-highlight.const';

/** One of `FOLDER_HIGHLIGHT`. */
export type FolderHighlight = (typeof FOLDER_HIGHLIGHT)[keyof typeof FOLDER_HIGHLIGHT];
