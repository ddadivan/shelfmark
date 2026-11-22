/** At most this many words dissolve one after the other (30 ms apart, so the whole clear stays under 320 ms). */
export const DISSOLVE_MAX_WORDS = 8;

/**
 * Splits a cleared value into the words of the dissolve overlay, each keeping the spaces after it
 * so the overlay lines up with the text that was in the field. Past `max` words the rest travels
 * with the last one. Leading spaces stay with the first word; a blank value gives no words.
 */
export function dissolveWords(value: string, max: number = DISSOLVE_MAX_WORDS): string[] {
  const words = value.match(/\s*\S+\s*/gu) ?? [];
  if (words.length <= max) {
    return words;
  }
  return [...words.slice(0, max - 1), words.slice(max - 1).join('')];
}
