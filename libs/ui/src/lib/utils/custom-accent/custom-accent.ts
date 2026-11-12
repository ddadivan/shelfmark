import {
  contrastRatio,
  hexToHsl,
  hslToHex,
  mixHex,
  parseHex,
} from '../colour-contrast/colour-contrast';
import type { CustomAccentTokens } from './models/custom-accent-tokens.interface';
import { CUSTOM_THEME_SURFACES } from '../../models/theme/models/custom-theme-surfaces.const';
import type { CustomThemeSurfaces } from '../../models/theme/models/custom-theme-surfaces.interface';

/** Text, links and focus against the page and panels (WCAG 2.1 AA, BRAND.md Colour). */
export const ACCENT_TEXT_CONTRAST = 4.5;
/** Large marks and boundaries: the accent on hovered rows and its own tint, the focus ring. */
const ACCENT_MARK_CONTRAST = 3;
/** Share of the accent in its tint (`accent-bg`), as in the curated families (about 14%). */
const TINT_SHARES = [0.14, 0.1, 0.06, 0.03];
/** How much darker (light base) or lighter (dark base) `accent-text` is than the accent. */
const TEXT_SHIFT = 0.4;
const STEPS = 24;

interface Ground {
  readonly surfaces: CustomThemeSurfaces;
  readonly bg: string;
  readonly dark: boolean;
}

function groundOf(base: string, background: string): Ground {
  const dark = base === 'dark';
  const surfaces = dark ? CUSTOM_THEME_SURFACES.dark : CUSTOM_THEME_SURFACES.light;
  const bg =
    surfaces.backgrounds[background] ?? Object.values(surfaces.backgrounds)[0] ?? '#ffffff';
  return { surfaces, bg, dark };
}

/** The accent's tint behind tags and the active row; text and muted text keep 4.5:1 on it. */
function tintOf(accent: string, ground: Ground): string {
  const { surface, text, textMuted } = ground.surfaces;
  for (const share of TINT_SHARES) {
    const tint = mixHex(surface, accent, share);
    if (
      contrastRatio(text, tint) >= ACCENT_TEXT_CONTRAST &&
      contrastRatio(textMuted, tint) >= ACCENT_TEXT_CONTRAST
    ) {
      return tint;
    }
  }
  return surface;
}

/** The lowest contrast of `accent` against what it must read on (its rules, not its ratio). */
function accentScore(accent: string, ground: Ground): { text: number; mark: number } {
  const { surface, surfaceHover, surfacePressed } = ground.surfaces;
  return {
    text: Math.min(contrastRatio(accent, ground.bg), contrastRatio(accent, surface)),
    mark: Math.min(
      contrastRatio(accent, surfaceHover),
      contrastRatio(accent, surfacePressed),
      contrastRatio(accent, tintOf(accent, ground)),
    ),
  };
}

function passes(accent: string, ground: Ground): boolean {
  const score = accentScore(accent, ground);
  return score.text >= ACCENT_TEXT_CONTRAST && score.mark >= ACCENT_MARK_CONTRAST;
}

/**
 * Moves the lightness of `hex` (hue and saturation kept) towards black on a light base, white on
 * a dark one, just far enough that `ok` holds. Black and white always pass, so it ends.
 */
function shift(hex: string, dark: boolean, ok: (candidate: string) => boolean): string {
  if (ok(hex)) {
    return hex;
  }
  const [h, s, l] = hexToHsl(hex);
  const goal = dark ? 1 : 0;
  // Binary search for the passing lightness nearest to the original one.
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
  // Rounding to #rrggbb can land a hair short: keep stepping until the colour itself passes.
  let candidate = hslToHex(h, s, far);
  for (let next = far; !ok(candidate) && next !== goal;) {
    next = dark ? Math.min(1, next + 0.004) : Math.max(0, next - 0.004);
    candidate = hslToHex(h, s, next);
  }
  return candidate;
}

/** The lowest of the text contrasts of an own accent on the page and panels of that ground. */
export function accentContrast(hex: string, base: string, background: string): number {
  return accentScore(hex.toLowerCase(), groundOf(base, background)).text;
}

/** Whether an own colour can be the accent of that base and background as it is. */
export function isAccessibleAccent(hex: string, base: string, background: string): boolean {
  return parseHex(hex) !== null && passes(hex.toLowerCase(), groundOf(base, background));
}

/**
 * The shade of `hex` nearest to it (same hue and saturation) that keeps the accent rules on that
 * base and background: 4.5:1 on the page and panels, 3:1 on hovered rows and its own tint. A
 * passing colour comes back unchanged (lower case).
 */
export function nearestAccessibleAccent(hex: string, base: string, background: string): string {
  const ground = groundOf(base, background);
  return shift(hex.toLowerCase(), ground.dark, (candidate) => passes(candidate, ground));
}

/**
 * The accent family of an own colour on a Custom theme base, the same four tokens a curated accent
 * sets (`tokens/_custom.scss`): the nearest accessible shade, its tint, a deeper (light base) or
 * paler (dark base) text colour that keeps 4.5:1 on the tint, panels and page, and the focus ring.
 */
export function customAccentTokens(
  hex: string,
  base: string,
  background: string,
): CustomAccentTokens {
  const ground = groundOf(base, background);
  const accent = nearestAccessibleAccent(hex, base, background);
  const tint = tintOf(accent, ground);
  const [h, s, l] = hexToHsl(accent);
  const start = hslToHex(h, s, ground.dark ? l + (1 - l) * TEXT_SHIFT : l * (1 - TEXT_SHIFT));
  const text = shift(start, ground.dark, (candidate) =>
    [tint, ground.surfaces.surface, ground.bg].every(
      (under) => contrastRatio(candidate, under) >= ACCENT_TEXT_CONTRAST,
    ),
  );
  return { '--accent': accent, '--accent-bg': tint, '--accent-text': text, '--focus-ring': accent };
}
