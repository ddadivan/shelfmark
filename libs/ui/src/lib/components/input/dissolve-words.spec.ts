import { describe, expect, it } from 'vitest';
import { DISSOLVE_MAX_WORDS, dissolveWords } from './dissolve-words';

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
