import { FOLDER_ICON } from './folder-icon.const';
import type { FolderIcon } from './folder-icon.type';
import { isFolderEmoji } from './is-folder-emoji';

const NAMES: readonly string[] = Object.values(FOLDER_ICON);

/** True for a known icon name (`FOLDER_ICON`). */
export function isFolderIconName(value: unknown): value is FolderIcon {
  return typeof value === 'string' && NAMES.includes(value);
}

/** True for what a folder may wear as its icon: a known icon name or exactly one emoji. */
export function isFolderIconValue(value: unknown): value is FolderIcon | string {
  return isFolderIconName(value) || isFolderEmoji(value);
}
