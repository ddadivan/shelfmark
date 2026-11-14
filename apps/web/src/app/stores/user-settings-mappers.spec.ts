import { LIBRARY_SETTINGS_DEFAULT, type UserSettingsResponse } from '@shelfmark/contracts';
import {
  appearanceOf,
  appended,
  languageOf,
  libraryOf,
  sameAppearance,
  sameLanguage,
} from './user-settings-mappers';

// Only the fields the mappers read; the rest of the response is not needed.
const SETTINGS = {
  theme: 'dark',
  customTheme: { base: 'dark', accent: '#112233', background: '#000000', corners: 'round' },
  motion: 'reduced',
  textSize: 'm',
  font: 'sans',
  density: 'comfortable',
  cardPreview: true,
  cardSite: true,
  cardNotes: false,
  cardTags: true,
  language: 'en',
  dateFormat: 'iso',
  timeFormat: '24h',
  weekStart: 'monday',
  ...LIBRARY_SETTINGS_DEFAULT,
} as unknown as UserSettingsResponse;

describe('user settings mappers', () => {
  it('picks the appearance, language and library parts of a response', () => {
    expect(appearanceOf(SETTINGS)).toMatchObject({ theme: 'dark', cardNotes: false });
    expect(languageOf(SETTINGS)).toEqual({
      language: 'en',
      dateFormat: 'iso',
      timeFormat: '24h',
      weekStart: 'monday',
    });
    expect(libraryOf(SETTINGS)).toEqual(LIBRARY_SETTINGS_DEFAULT);
  });

  it('compares appearances including the custom theme', () => {
    const a = appearanceOf(SETTINGS);

    expect(sameAppearance(a, { ...a, customTheme: { ...a.customTheme } })).toBe(true);
    expect(sameAppearance(a, { ...a, customTheme: { ...a.customTheme, accent: '#ffffff' } })).toBe(
      false,
    );
    expect(sameAppearance(a, { ...a, cardTags: !a.cardTags })).toBe(false);
  });

  it('compares language settings', () => {
    const a = languageOf(SETTINGS);

    expect(sameLanguage(a, { ...a })).toBe(true);
    expect(sameLanguage(a, { ...a, weekStart: 'sunday' } as typeof a)).toBe(false);
  });

  it('appends an item once, at the end, within the limit', () => {
    expect(appended(['a', 'b'], 'c', 5)).toEqual(['a', 'b', 'c']);
    expect(appended(['a', 'b', 'c'], 'a', 5)).toEqual(['b', 'c', 'a']);
    expect(appended(['a', 'b', 'c'], 'd', 3)).toEqual(['b', 'c', 'd']);
  });
});
