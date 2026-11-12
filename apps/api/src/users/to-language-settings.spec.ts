import { LANGUAGE_SETTINGS_DEFAULT } from '@shelfmark/contracts';
import { toLanguageSettings } from './to-language-settings';

describe('toLanguageSettings', () => {
  it('reads valid columns as they are', () => {
    expect(
      toLanguageSettings({
        language: 'de',
        dateFormat: 'iso',
        timeFormat: 'h12',
        weekStart: 'sunday',
        languageSavedAt: new Date(0),
      }),
    ).toEqual({
      language: 'de',
      dateFormat: 'iso',
      timeFormat: 'h12',
      weekStart: 'sunday',
      languageSaved: true,
    });
  });

  it('falls back to the defaults for values outside the allow-lists', () => {
    expect(
      toLanguageSettings({
        language: 'uk',
        dateFormat: 'yyyy',
        timeFormat: '13h',
        weekStart: 'saturday',
        languageSavedAt: null,
      }),
    ).toEqual({ ...LANGUAGE_SETTINGS_DEFAULT, languageSaved: false });
  });
});
