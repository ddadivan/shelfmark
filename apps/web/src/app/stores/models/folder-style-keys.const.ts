import type { FolderStyleChange } from './folder-style-change.type';

/** The fields of a `FolderStyleChange`, in the order they are compared and rolled back. */
export const FOLDER_STYLE_KEYS: readonly (keyof FolderStyleChange)[] = [
  'colour',
  'icon',
  'description',
];
