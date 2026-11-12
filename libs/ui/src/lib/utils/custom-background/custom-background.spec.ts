import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../colour-contrast/colour-contrast';
import { CUSTOM_THEME_SURFACES } from '../../models/theme/models/custom-theme-surfaces.const';
import {
  backgroundContrast,
  BACKGROUND_TEXT_CONTRAST,
  customBackgroundTokens,
  isReadableBackground,
  nearestReadableBackground,
} from './custom-background';

const SPREAD = [
  '#ffffff',
  '#f4f4f1',
  '#fdf6e3',
  '#ff0000',
  '#808080',
  '#2e6a99',
  '#0b1d2a',
  '#000000',
  '#7a4b8a',
  '#ffd700',
];

describe('custom background', () => {
  it('keeps a readable colour as it is (lower case)', () => {
    expect(nearestReadableBackground('#FDF6E3', 'light')).toBe('#fdf6e3');
    expect(nearestReadableBackground('#0B1D2A', 'dark')).toBe('#0b1d2a');
  });

  it.each(['light', 'dark'] as const)(
    'every colour of a spread ends up with text and muted text at 4.5:1 on the %s base',
    (base) => {
      const { text, textMuted } = CUSTOM_THEME_SURFACES[base];
      for (const hex of SPREAD) {
        const bg = customBackgroundTokens(hex, base)['--bg'];
        expect(contrastRatio(text, bg), `${hex} text`).toBeGreaterThanOrEqual(
          BACKGROUND_TEXT_CONTRAST,
        );
        expect(contrastRatio(textMuted, bg), `${hex} muted`).toBeGreaterThanOrEqual(
          BACKGROUND_TEXT_CONTRAST,
        );
        expect(isReadableBackground(bg, base)).toBe(true);
      }
    },
  );

  it('moves towards white on a light base and towards black on a dark one', () => {
    expect(isReadableBackground('#808080', 'light')).toBe(false);
    const light = nearestReadableBackground('#808080', 'light');
    expect(parseInt(light.slice(1, 3), 16)).toBeGreaterThan(0x80);
    const dark = nearestReadableBackground('#808080', 'dark');
    expect(parseInt(dark.slice(1, 3), 16)).toBeLessThan(0x80);
  });

  it('measures the lower of the two text contrasts and refuses anything that is not a colour', () => {
    expect(backgroundContrast('#ffffff', 'light')).toBeGreaterThan(5);
    expect(isReadableBackground('red', 'light')).toBe(false);
  });
});
