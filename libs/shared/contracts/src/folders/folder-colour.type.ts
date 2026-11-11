import type { FOLDER_COLOUR } from './folder-colour.const';

/** One of `FOLDER_COLOUR`. */
export type FolderColour = (typeof FOLDER_COLOUR)[keyof typeof FOLDER_COLOUR];
