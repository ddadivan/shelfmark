import type { DateFormat } from './date-format.type';
import type { InterfaceLanguage } from './interface-language.type';
import type { TimeFormat } from './time-format.type';
import type { WeekStart } from './week-start.type';

/**
 * Settings › Language (#274), part of `UserSettingsResponse`. The first write of any of them marks
 * them saved (`languageSaved`). Spell-check in the note field is always on (#326): the former
 * `spellcheck` setting is gone; its column is dropped by a later migration.
 */
export interface LanguageSettings {
  /** Default `browser`. */
  language: InterfaceLanguage;
  /** Default `default` (the language's own medium date). */
  dateFormat: DateFormat;
  /** Default `default`. */
  timeFormat: TimeFormat;
  /** Default `default`. */
  weekStart: WeekStart;
}
