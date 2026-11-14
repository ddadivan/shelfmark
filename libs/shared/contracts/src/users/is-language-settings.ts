import { DATE_FORMAT } from './date-format.const';
import type { DateFormat } from './date-format.type';
import { INTERFACE_LANGUAGE } from './interface-language.const';
import type { InterfaceLanguage } from './interface-language.type';
import type { LanguageSettings } from './language-settings.interface';
import { TIME_FORMAT } from './time-format.const';
import type { TimeFormat } from './time-format.type';
import { WEEK_START } from './week-start.const';
import type { WeekStart } from './week-start.type';

const LANGUAGE_KEYS = 'dateFormat,language,timeFormat,weekStart';

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

export function isInterfaceLanguage(value: unknown): value is InterfaceLanguage {
  return isOneOf(Object.values(INTERFACE_LANGUAGE), value);
}

export function isDateFormat(value: unknown): value is DateFormat {
  return isOneOf(Object.values(DATE_FORMAT), value);
}

export function isTimeFormat(value: unknown): value is TimeFormat {
  return isOneOf(Object.values(TIME_FORMAT), value);
}

export function isWeekStart(value: unknown): value is WeekStart {
  return isOneOf(Object.values(WEEK_START), value);
}

/** A whole, valid `LanguageSettings` with no other keys (what the web stores for the first paint). */
export function isLanguageSettings(value: unknown): value is LanguageSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).sort().join(',') === LANGUAGE_KEYS &&
    isInterfaceLanguage(record['language']) &&
    isDateFormat(record['dateFormat']) &&
    isTimeFormat(record['timeFormat']) &&
    isWeekStart(record['weekStart'])
  );
}
