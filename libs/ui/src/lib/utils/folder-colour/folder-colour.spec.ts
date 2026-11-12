import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../colour-contrast/colour-contrast';
import { folderColourShades } from './folder-colour';

describe('folderColourShades', () => {
  it.each(['#3a7bd5', '#ffd700', '#000000', '#ffffff', '#e5484d', '#7a4b8a'])(
    'draws %s with a readable glyph on its tile on both bases',
    (hex) => {
      const shades = folderColourShades(hex);
      expect(shades).not.toBeNull();
      for (const shade of [shades?.light, shades?.dark]) {
        expect(contrastRatio(shade?.glyph ?? '', shade?.tile ?? '')).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it('is null for anything that is not #rrggbb', () => {
    expect(folderColourShades('sage')).toBeNull();
    expect(folderColourShades('#fff')).toBeNull();
  });
});
