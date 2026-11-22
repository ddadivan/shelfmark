import { describe, expect, it } from 'vitest';
import { DISSOLVE_MAX_WORDS, dissolveStep, dissolveWords } from './dissolve-words';
import { DISSOLVE_TIMING } from './models/dissolve-timing.const';

describe('dissolveWords', () => {
  it('splits into words that keep their trailing spaces', () => {
    expect(dissolveWords('red  pepper soup')).toEqual(['red  ', 'pepper ', 'soup']);
    expect(dissolveWords('red pepper soup').join('')).toBe('red pepper soup');
  });

  it('keeps leading spaces and gives nothing for blank text', () => {
    expect(dissolveWords('  a b').join('')).toBe('  a b');
    expect(dissolveWords('   ')).toEqual([]);
    expect(dissolveWords('')).toEqual([]);
  });

  it('caps the words and keeps the rest with the last one', () => {
    const value = 'a b c d e f g h i j k';
    const words = dissolveWords(value);
    expect(words).toHaveLength(DISSOLVE_MAX_WORDS);
    expect(words.join('')).toBe(value);
    expect(words.at(-1)).toBe('h i j k');
  });
});

describe('dissolveStep', () => {
  it('has no step for one word and the full step for a few', () => {
    expect(dissolveStep(0)).toBe(0);
    expect(dissolveStep(1)).toBe(0);
    expect(dissolveStep(2)).toBe(DISSOLVE_TIMING.StepMs);
    expect(dissolveStep(3)).toBe(DISSOLVE_TIMING.StepMs);
  });

  it('shrinks the step for many words so the last one ends within the Motion limit', () => {
    for (let words = 2; words <= DISSOLVE_MAX_WORDS; words++) {
      const end = dissolveStep(words) * (words - 1) + DISSOLVE_TIMING.WordMs;
      expect(end).toBeLessThanOrEqual(DISSOLVE_TIMING.TotalMs);
    }
    expect(dissolveStep(DISSOLVE_MAX_WORDS)).toBeLessThan(DISSOLVE_TIMING.StepMs);
  });
});
