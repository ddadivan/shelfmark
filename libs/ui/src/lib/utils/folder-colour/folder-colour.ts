import {
  contrastRatio,
  hexToHsl,
  hslToHex,
  mixHex,
  parseHex,
} from '../colour-contrast/colour-contrast';
import { CUSTOM_THEME_SURFACES } from '../../models/theme/models/custom-theme-surfaces.const';
import type { FolderColourShades } from './models/folder-colour-shades.interface';
import type { FolderColourShade } from './models/folder-colour-shade.interface';

/** The glyph on its tile: a graphical object (3:1 would do), kept at the text ratio like the built-in colours. */
const GLYPH_CONTRAST = 4.5;
const TILE_SHARE = { light: 0.16, dark: 0.24 } as const;
const STEPS = 24;

function shade(hex: string, dark: boolean): FolderColourShade {
  const ground = dark ? CUSTOM_THEME_SURFACES.dark : CUSTOM_THEME_SURFACES.light;
  const tile = mixHex(ground.surface, hex, dark ? TILE_SHARE.dark : TILE_SHARE.light);
  const ok = (candidate: string): boolean => contrastRatio(candidate, tile) >= GLYPH_CONTRAST;
  if (ok(hex)) {
    return { tile, glyph: hex };
  }
  // Same hue and saturation, lightness towards black (light base) or white (dark base).
  const [h, s, l] = hexToHsl(hex);
  const goal = dark ? 1 : 0;
  let near = l;
  let far = goal;
  for (let i = 0; i < STEPS; i++) {
    const mid = (near + far) / 2;
    if (ok(hslToHex(h, s, mid))) {
      far = mid;
    } else {
      near = mid;
    }
  }
  let glyph = hslToHex(h, s, far);
  for (let next = far; !ok(glyph) && next !== goal;) {
    next = dark ? Math.min(1, next + 0.004) : Math.max(0, next - 0.004);
    glyph = hslToHex(h, s, next);
  }
  return { tile, glyph };
}

/**
 * Tile tint and glyph colour of an own folder colour (`#rrggbb`) on both theme bases, with the
 * contrast helpers of the custom accent: the tile is a light share of the colour over the panel
 * colour, the glyph the nearest shade of the colour that keeps 4.5:1 on that tile. `null` for
 * anything that is not a hex colour.
 */
export function folderColourShades(hex: string): FolderColourShades | null {
  if (parseHex(hex) === null) {
    return null;
  }
  const colour = hex.toLowerCase();
  return { light: shade(colour, false), dark: shade(colour, true) };
}
