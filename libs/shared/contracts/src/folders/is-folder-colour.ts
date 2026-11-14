import { isHexColour } from '../users/is-hex-colour';
import { FOLDER_COLOUR } from './folder-colour.const';
import type { FolderColour } from './folder-colour.type';

const NAMES: readonly string[] = Object.values(FOLDER_COLOUR);

/** True for one of `FOLDER_COLOUR`. */
export function isFolderColourName(value: unknown): value is FolderColour {
  return typeof value === 'string' && NAMES.includes(value);
}

/** True for what a folder may wear as its colour: a built-in name or an own lower-case `#rrggbb`. */
export function isFolderColourValue(value: unknown): value is FolderColour | `#${string}` {
  return isFolderColourName(value) || isHexColour(value);
}
