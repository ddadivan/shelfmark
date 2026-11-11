import { CUSTOM_THEME_ACCENT } from './custom-theme-accent.const';
import { CUSTOM_THEME_BACKGROUNDS } from './custom-theme-backgrounds.const';
import { CUSTOM_THEME_BACKGROUND } from './custom-theme-background.const';
import { CUSTOM_THEME_CORNERS } from './custom-theme-corners.const';
import { CUSTOM_THEME_DEFAULT } from './custom-theme-default.const';
import {
  isBackgroundOfBase,
  isCustomTheme,
  isMotionPreference,
  isThemePreference,
} from './is-custom-theme';

describe('custom theme guards', () => {
  it('accepts the default and every allowed combination', () => {
    expect(isCustomTheme(CUSTOM_THEME_DEFAULT)).toBe(true);
    for (const [base, backgrounds] of Object.entries(CUSTOM_THEME_BACKGROUNDS)) {
      for (const background of backgrounds) {
        for (const accent of Object.values(CUSTOM_THEME_ACCENT)) {
          for (const corners of Object.values(CUSTOM_THEME_CORNERS)) {
            expect(isCustomTheme({ base, accent, background, corners })).toBe(true);
          }
        }
      }
    }
  });

  it('splits every background between the two bases, once', () => {
    const all = [...CUSTOM_THEME_BACKGROUNDS.light, ...CUSTOM_THEME_BACKGROUNDS.dark];
    expect([...all].sort()).toEqual(Object.values(CUSTOM_THEME_BACKGROUND).sort());
  });

  it.each([
    null,
    'ocean',
    [],
    {},
    { ...CUSTOM_THEME_DEFAULT, accent: 'red' },
    { ...CUSTOM_THEME_DEFAULT, accent: '#ff0000' },
    { ...CUSTOM_THEME_DEFAULT, corners: 'pill' },
    { ...CUSTOM_THEME_DEFAULT, base: 'sepia' },
    { ...CUSTOM_THEME_DEFAULT, background: 'black' },
    { ...CUSTOM_THEME_DEFAULT, extra: 1 },
    { base: 'light', accent: 'ocean', background: 'paper' },
  ])('rejects %j', (value) => {
    expect(isCustomTheme(value)).toBe(false);
  });

  it('checks the background belongs to its base', () => {
    expect(isBackgroundOfBase('dark', 'ink')).toBe(true);
    expect(isBackgroundOfBase('light', 'ink')).toBe(false);
    expect(isBackgroundOfBase('other', 'ink')).toBe(false);
  });

  it('narrows theme and motion preferences', () => {
    expect(isThemePreference('custom')).toBe(true);
    expect(isThemePreference('sepia')).toBe(false);
    expect(isThemePreference(1)).toBe(false);
    expect(isMotionPreference('reduced')).toBe(true);
    expect(isMotionPreference('none')).toBe(false);
  });
});
