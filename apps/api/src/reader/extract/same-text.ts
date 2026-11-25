/** Same text, ignoring case, spacing and punctuation (a heading repeating the title). */
export function sameText(a: string, b: string): boolean {
  const key = (value: string): string => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return key(a) === key(b);
}
