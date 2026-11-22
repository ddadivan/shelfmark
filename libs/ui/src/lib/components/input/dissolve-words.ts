import { DISSOLVE_TIMING } from './models/dissolve-timing.const';

/** At most this many words dissolve one after the other (the rest travels with the last). */
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

/**
 * The step between two dissolving words (ms): `DISSOLVE_TIMING.StepMs`, shrunk for many words so
 * the last one still ends within `DISSOLVE_TIMING.TotalMs`. One word has no step.
 */
export function dissolveStep(words: number): number {
  if (words <= 1) {
    return 0;
  }
  const room = DISSOLVE_TIMING.TotalMs - DISSOLVE_TIMING.WordMs;
  return Math.min(DISSOLVE_TIMING.StepMs, Math.floor(room / (words - 1)));
}
