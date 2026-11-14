import type { FolderResponse } from '@shelfmark/contracts';
import type { FolderStyleChange } from './models/folder-style-change.type';

/** The given style fields of `source` (a change or a folder), ready to patch a `FolderResponse`. */
export function pickStyle(
  source: FolderStyleChange,
  keys: readonly (keyof FolderStyleChange)[],
): Partial<FolderResponse> {
  return Object.fromEntries(keys.map((key) => [key, source[key]])) as Partial<FolderResponse>;
}
