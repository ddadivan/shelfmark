import type { AppLang } from './app-lang.type';

/**
 * Each language in its own name (the language list never translates them), in list order. Not
 * translation keys on purpose: "Deutsch" reads "Deutsch" in every interface language.
 */
export const LANGUAGE_NAMES: Readonly<Record<AppLang, string>> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  es: 'Español',
  pt: 'Português',
};
