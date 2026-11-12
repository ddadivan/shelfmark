import { contrastRatio, hexToHsl, hslToHex, parseHex } from '../colour-contrast/colour-contrast';
import { CUSTOM_THEME_SURFACES } from '../../models/theme/models/custom-theme-surfaces.const';
import type { CustomBackgroundTokens } from './models/custom-background-tokens.interface';

/** Text and muted text on the page background (WCAG 2.1 AA, BRAND.md Colour). */
export const BACKGROUND_TEXT_CONTRAST = 4.5;
const STEPS = 24;

function surfacesOf(base: string) {
  return base === 'dark' ? CUSTOM_THEME_SURFACES.dark : CUSTOM_THEME_SURFACES.light;
}

/** The lowest contrast of text and muted text of that base on the colour used as the page. */
export function backgroundContrast(hex: string, base: string): number {
  const { text, textMuted } = surfacesOf(base);
  const bg = hex.toLowerCase();
  return Math.min(contrastRatio(text, bg), contrastRatio(textMuted, bg));
}

/** Whether an own colour can be the page background of that base as it is. */
export function isReadableBackground(hex: string, base: string): boolean {
  return parseHex(hex) !== null && backgroundContrast(hex, base) >= BACKGROUND_TEXT_CONTRAST;
}

/**
 * The shade of `hex` nearest to it (same hue and saturation) on which text and muted text keep
 * 4.5:1: lightness moves towards white on a light base and towards black on a dark one (the
 * text colours are dark and light). A passing colour comes back unchanged (lower case).
 */
export function nearestReadableBackground(hex: string, base: string): string {
  const colour = hex.toLowerCase();
  const ok = (candidate: string): boolean => isReadableBackground(candidate, base);
  if (ok(colour)) {
    return colour;
  }
  const dark = base === 'dark';
  const [h, s, l] = hexToHsl(colour);
  const goal = dark ? 0 : 1;
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
  let candidate = hslToHex(h, s, far);
  for (let next = far; !ok(candidate) && next !== goal;) {
    next = dark ? Math.max(0, next - 0.004) : Math.min(1, next + 0.004);
    candidate = hslToHex(h, s, next);
  }
  return candidate;
}

/** The page background of an own colour: its nearest readable shade as `--bg`. */
export function customBackgroundTokens(hex: string, base: string): CustomBackgroundTokens {
  return { '--bg': nearestReadableBackground(hex, base) };
}
