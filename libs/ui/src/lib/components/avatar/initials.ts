const MAX_INITIALS = 2;

function firstGrapheme(word: string, segmenter: Intl.Segmenter): string {
  const first = segmenter.segment(word)[Symbol.iterator]().next();
  return first.done ? '' : first.value.segment;
}

/**
 * Up to two upper-case initials of a display name, Unicode-safe (graphemes, not UTF-16 units):
 * "Dmytro Dadivan" gives "DD", "ada" gives "A", an emoji or a combining sequence stays whole.
 * Two or more words use the first letter of the first and of the last word.
 */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) {
    return '';
  }
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const picked = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return picked
    .slice(0, MAX_INITIALS)
    .map((word) => firstGrapheme(word.toLocaleUpperCase(), segmenter))
    .join('');
}
