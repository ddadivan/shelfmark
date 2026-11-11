import { DATE_FORMAT } from './date-format.const';
import { INTERFACE_LANGUAGE } from './interface-language.const';
import type { LanguageSettings } from './language-settings.interface';
import { TIME_FORMAT } from './time-format.const';
import { WEEK_START } from './week-start.const';

/** What a new account has: the browser's language and its conventions, spell-check on. */
export const LANGUAGE_SETTINGS_DEFAULT: Readonly<LanguageSettings> = {
  language: INTERFACE_LANGUAGE.Browser,
  dateFormat: DATE_FORMAT.Default,
  timeFormat: TIME_FORMAT.Default,
  weekStart: WEEK_START.Default,
  spellcheck: true,
};
