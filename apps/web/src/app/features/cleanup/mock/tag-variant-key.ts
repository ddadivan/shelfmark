/** Separators ignored when comparing tag names by rule: hyphen, underscore, space and dot. */
const SEPARATORS = /[-_ .]+/g;
/** A trailing plural `s` is dropped only when at least this many characters stay (`news` stays). */
const STEM_MIN = 4;

/**
 * The rule key of a tag name, as the API's `tagVariantKey` (ADR 0052 point 2): lower case,
 * diacritics and separators removed, one trailing `s` dropped (not after `s`, and only when four
 * characters stay). Two tags with the same non-empty key are "similar by rule".
 */
export function tagVariantKey(name: string): string {
  const plain = name
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(SEPARATORS, '');
  if (plain.length > STEM_MIN && plain.endsWith('s') && !plain.endsWith('ss')) {
    return plain.slice(0, -1);
  }
  return plain;
}
