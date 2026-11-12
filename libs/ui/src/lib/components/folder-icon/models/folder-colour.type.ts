import type { FOLDER_COLOUR } from './folder-colour.const';

export type FolderColour = (typeof FOLDER_COLOUR)[keyof typeof FOLDER_COLOUR];
