/** Separators ignored when comparing tag names by rule: hyphen, underscore, space and dot. */
const SEPARATORS = /[-_ .]+/g;
/** A trailing plural `s` is dropped only when at least this many characters stay (`news` stays). */
const STEM_MIN = 4;

/**
 * The rule key of a tag name (ADR 0053 point 2, no model): lower case, diacritics removed, separators
 * removed and one trailing `s` dropped (not after `s`, and only when four characters stay). Two tags
 * with the same non-empty key are "similar by rule" (`recipe` / `Recipes`, `front-end` / `frontend`).
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
