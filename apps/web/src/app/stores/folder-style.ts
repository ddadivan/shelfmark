import type { FolderResponse } from '@shelfmark/contracts';
import type { FolderStyleChange } from './models/folder-style-change.type';
import { FOLDER_STYLE_KEYS } from './models/folder-style-keys.const';

/** The given style fields of `source` (a change or a folder), ready to patch a `FolderResponse`. */
export function pickStyle(
  source: FolderStyleChange,
  keys: readonly (keyof FolderStyleChange)[],
): Partial<FolderResponse> {
  return Object.fromEntries(keys.map((key) => [key, source[key]])) as Partial<FolderResponse>;
}

/** The fields of a whole chosen style that differ from the folder (empty when nothing changed). */
export function changedStyle(
  style: Required<FolderStyleChange>,
  folder: FolderResponse,
): FolderStyleChange {
  const keys = FOLDER_STYLE_KEYS.filter((key) => style[key] !== folder[key]);
  return Object.fromEntries(keys.map((key) => [key, style[key]])) as FolderStyleChange;
}
