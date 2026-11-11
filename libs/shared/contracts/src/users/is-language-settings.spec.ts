import { LANGUAGE_SETTINGS_DEFAULT } from './language-settings-default.const';
import {
  isDateFormat,
  isInterfaceLanguage,
  isLanguageSettings,
  isTimeFormat,
  isWeekStart,
} from './is-language-settings';

describe('language settings guards', () => {
  it('accepts the allow-listed values only', () => {
    expect(isInterfaceLanguage('fr')).toBe(true);
    expect(isInterfaceLanguage('browser')).toBe(true);
    expect(isInterfaceLanguage('uk')).toBe(false);
    expect(isInterfaceLanguage('constructor')).toBe(false);
    expect(isDateFormat('iso')).toBe(true);
    expect(isDateFormat('yyyy')).toBe(false);
    expect(isTimeFormat('h12')).toBe(true);
    expect(isTimeFormat(12)).toBe(false);
    expect(isWeekStart('sunday')).toBe(true);
    expect(isWeekStart('saturday')).toBe(false);
  });

  it('accepts a whole settings object without extra keys', () => {
    expect(isLanguageSettings({ ...LANGUAGE_SETTINGS_DEFAULT })).toBe(true);
    expect(isLanguageSettings({ ...LANGUAGE_SETTINGS_DEFAULT, language: 'de' })).toBe(true);
    expect(isLanguageSettings({ ...LANGUAGE_SETTINGS_DEFAULT, extra: 1 })).toBe(false);
    expect(isLanguageSettings({ ...LANGUAGE_SETTINGS_DEFAULT, spellcheck: 'yes' })).toBe(false);
    expect(isLanguageSettings({ language: 'en' })).toBe(false);
    expect(isLanguageSettings(null)).toBe(false);
    expect(isLanguageSettings([])).toBe(false);
  });
});
