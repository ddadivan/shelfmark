const WORD = /[\p{L}\p{N}]+/gu;
/** Suffixes stripped once, longest first, keeping at least four letters (`s` keeps three). */
const SUFFIXES = [
  'ations',
  'ation',
  'ances',
  'ance',
  'ences',
  'ence',
  'ities',
  'ity',
  'ings',
  'ing',
  'ers',
  'er',
  'ed',
  'es',
  'ly',
] as const;
const STOP_WORDS: ReadonlySet<string> = new Set([
  'the',
  'and',
  'for',
  'with',
  'about',
  'from',
  'that',
  'this',
  'into',
  'your',
  'are',
  'was',
  'how',
  'what',
  'why',
  'talk',
]);
const MIN_WORD_LENGTH = 3;

/** Light stemming: lower case and one common English suffix stripped. */
export function wordStem(word: string): string {
  const lower = word.toLowerCase();
  const suffix = SUFFIXES.find((s) => lower.endsWith(s) && lower.length - s.length >= 4);
  if (suffix !== undefined) return lower.slice(0, -suffix.length);
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length - 1 >= 3) {
    return lower.slice(0, -1);
  }
  return lower;
}

/** The distinct stems of a text: words of three or more letters, a few stop words left out. */
export function wordStems(text: string): string[] {
  const stems = new Set<string>();
  for (const [word] of text.matchAll(WORD)) {
    if (word.length < MIN_WORD_LENGTH) continue;
    const lower = word.toLowerCase();
    if (STOP_WORDS.has(lower)) continue;
    stems.add(wordStem(lower));
  }
  return [...stems];
}
