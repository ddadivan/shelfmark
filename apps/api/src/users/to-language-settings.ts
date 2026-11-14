import {
  LANGUAGE_SETTINGS_DEFAULT,
  isDateFormat,
  isInterfaceLanguage,
  isTimeFormat,
  isWeekStart,
  type LanguageSettings,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import type { LanguageRow } from './models/language-row.interface';

/**
 * Reads the Settings › Language part of the settings. The CHECKs keep the text columns valid; a
 * value that still slips through (a hand edit) falls back to the default.
 */
export function toLanguageSettings(
  row: LanguageRow,
): LanguageSettings & Pick<UserSettingsResponse, 'languageSaved'> {
  const d = LANGUAGE_SETTINGS_DEFAULT;
  return {
    language: isInterfaceLanguage(row.language) ? row.language : d.language,
    dateFormat: isDateFormat(row.dateFormat) ? row.dateFormat : d.dateFormat,
    timeFormat: isTimeFormat(row.timeFormat) ? row.timeFormat : d.timeFormat,
    weekStart: isWeekStart(row.weekStart) ? row.weekStart : d.weekStart,
    languageSaved: row.languageSavedAt !== null,
  };
}
