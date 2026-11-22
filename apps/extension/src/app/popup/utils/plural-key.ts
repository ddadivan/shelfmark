const rules = new Map<string, Intl.PluralRules>();

function rulesFor(lang: string): Intl.PluralRules {
  let found = rules.get(lang);
  if (!found) {
    found = new Intl.PluralRules(lang);
    rules.set(lang, found);
  }
  return found;
}

/** The plural categories a translation file needs for a plural key in `lang`. */
export function pluralCategories(lang: string): readonly Intl.LDMLPluralRule[] {
  return rulesFor(lang).resolvedOptions().pluralCategories;
}

/** `base.<category>` by the plural rule of `lang` (English `one` / `other`, Ukrainian also `few` / `many`). */
export function pluralKey(base: string, count: number, lang: string): string {
  return `${base}.${rulesFor(lang).select(count)}`;
}
