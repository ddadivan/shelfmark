import { activeLang } from './active-lang';
import type { AppLang } from './models/app-lang.type';

const rules = new Map<string, Intl.PluralRules>();

function rulesFor(lang: string): Intl.PluralRules {
  let found = rules.get(lang);
  if (!found) {
    found = new Intl.PluralRules(lang);
    rules.set(lang, found);
  }
  return found;
}

/** The plural categories a translation file needs for a plural key in `lang` (`one`, `many`, `other`…). */
export function pluralCategories(lang: AppLang): readonly Intl.LDMLPluralRule[] {
  return rulesFor(lang).resolvedOptions().pluralCategories;
}

/**
 * `base.<category>` by the plural rule of the active language (`Intl.PluralRules`): English and
 * German use `one` / `other`, French, Italian, Spanish and Portuguese add `many` (for millions).
 * Every language file has the categories its language needs (the key-parity spec checks it).
 * Reads the active language signal, so a `computed` around it follows a language switch.
 */
export function pluralKey(base: string, count: number, lang: AppLang = activeLang()): string {
  return `${base}.${rulesFor(lang).select(count)}`;
}
