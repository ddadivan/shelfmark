import { FOLDER_COLOUR } from '../../components/folder-icon/models/folder-colour.const';
import { folderColourShades } from './folder-colour';
import type { FolderColourTokens } from './models/folder-colour-tokens.interface';

const NAMES: readonly string[] = Object.values(FOLDER_COLOUR);

/**
 * The CSS values of a folder colour for anything drawn in it besides the tile (#418: the folder
 * header band, the sidebar highlight, the folder chip): a built-in name gives its token pair
 * (`var(--folder-<name>)` on `var(--folder-<name>-bg)`), an own `#rrggbb` the shades of
 * `folderColourShades` for both bases, picked by `light-dark()` from the page's `color-scheme`.
 * `null` for graphite (no colour was chosen, so nothing is tinted) and for anything unknown.
 */
export function folderColourTokens(colour: string): FolderColourTokens | null {
  if (colour === FOLDER_COLOUR.Graphite) {
    return null;
  }
  if (NAMES.includes(colour)) {
    return { ink: `var(--folder-${colour})`, tint: `var(--folder-${colour}-bg)` };
  }
  const shades = folderColourShades(colour);
  return shades
    ? {
        ink: `light-dark(${shades.light.glyph}, ${shades.dark.glyph})`,
        tint: `light-dark(${shades.light.tile}, ${shades.dark.tile})`,
      }
    : null;
}
