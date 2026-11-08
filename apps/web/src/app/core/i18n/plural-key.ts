const RULES = new Intl.PluralRules('en');

/** `base.one` or `base.other` by the English plural rule; the translation file has both keys. */
export function pluralKey(base: string, count: number): string {
  return `${base}.${RULES.select(count) === 'one' ? 'one' : 'other'}`;
}
