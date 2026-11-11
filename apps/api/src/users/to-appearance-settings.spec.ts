import { CUSTOM_THEME_DEFAULT } from '@shelfmark/contracts';
import { customThemeColumns, toAppearanceSettings } from './to-appearance-settings';

describe('toAppearanceSettings', () => {
  it('maps valid columns', () => {
    expect(
      toAppearanceSettings({
        theme: 'custom',
        customThemeBase: 'dark',
        customThemeAccent: 'teal',
        customThemeBackground: 'forest',
        customThemeCorners: 'round',
        motion: 'reduced',
        appearanceSavedAt: new Date(0),
      }),
    ).toEqual({
      theme: 'custom',
      customTheme: { base: 'dark', accent: 'teal', background: 'forest', corners: 'round' },
      motion: 'reduced',
      appearanceSaved: true,
    });
  });

  it('falls back to the defaults for values a hand edit put past the CHECKs', () => {
    expect(
      toAppearanceSettings({
        theme: 'sepia',
        customThemeBase: 'light',
        customThemeAccent: 'red',
        customThemeBackground: 'paper',
        customThemeCorners: 'soft',
        motion: 'none',
        appearanceSavedAt: null,
      }),
    ).toEqual({
      theme: 'system',
      customTheme: CUSTOM_THEME_DEFAULT,
      motion: 'system',
      appearanceSaved: false,
    });
  });

  it('writes the four custom theme columns', () => {
    expect(customThemeColumns(CUSTOM_THEME_DEFAULT)).toEqual({
      customThemeBase: 'light',
      customThemeAccent: 'ocean',
      customThemeBackground: 'paper',
      customThemeCorners: 'soft',
    });
  });
});
