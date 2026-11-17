import { folderColourShades } from './folder-colour';
import { folderColourTokens } from './folder-colour-tokens';

describe('folderColourTokens', () => {
  it('gives the token pair of a built-in colour', () => {
    expect(folderColourTokens('ocean')).toEqual({
      ink: 'var(--folder-ocean)',
      tint: 'var(--folder-ocean-bg)',
    });
  });

  it('gives both bases of an own colour through light-dark()', () => {
    const shades = folderColourShades('#3a7bd5');
    expect(folderColourTokens('#3a7bd5')).toEqual({
      ink: `light-dark(${shades?.light.glyph}, ${shades?.dark.glyph})`,
      tint: `light-dark(${shades?.light.tile}, ${shades?.dark.tile})`,
    });
  });

  it('tints nothing for graphite or an unknown value', () => {
    expect(folderColourTokens('graphite')).toBeNull();
    expect(folderColourTokens('purple')).toBeNull();
    expect(folderColourTokens('')).toBeNull();
  });
});
