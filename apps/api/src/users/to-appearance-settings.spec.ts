import { CUSTOM_THEME_DEFAULT, LAYOUT_SETTINGS_DEFAULT } from '@shelfmark/contracts';
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
        customColours: ['#3a7bd5', 'red'],
        motion: 'reduced',
        appearanceSavedAt: new Date(0),
        textSize: 'xl',
        font: 'readable',
        density: 'compact',
        cardPreview: 'off',
        cardSite: false,
        cardNotes: false,
        cardTags: true,
      }),
    ).toEqual({
      theme: 'custom',
      customTheme: { base: 'dark', accent: 'teal', background: 'forest', corners: 'round' },
      customColours: ['#3a7bd5'],
      motion: 'reduced',
      appearanceSaved: true,
      textSize: 'xl',
      font: 'readable',
      density: 'compact',
      cardPreview: 'off',
      cardSite: false,
      cardNotes: false,
      cardTags: true,
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
        customColours: [],
        motion: 'none',
        appearanceSavedAt: null,
        textSize: 'huge',
        font: 'comic',
        density: 'airy',
        cardPreview: 'giant',
        cardSite: true,
        cardNotes: true,
        cardTags: true,
      }),
    ).toEqual({
      theme: 'system',
      customTheme: CUSTOM_THEME_DEFAULT,
      customColours: [],
      motion: 'system',
      appearanceSaved: false,
      ...LAYOUT_SETTINGS_DEFAULT,
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
