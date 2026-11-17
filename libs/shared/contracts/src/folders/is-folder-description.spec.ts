import { describe, expect, it } from 'vitest';
import { FOLDER_LIMIT } from './folder-limit.const';
import { isFolderDescription, normalizeFolderDescription } from './is-folder-description';

describe('isFolderDescription', () => {
  it('accepts short text, blank text and text that fits once trimmed', () => {
    expect(isFolderDescription('Recipes worth cooking twice')).toBe(true);
    expect(isFolderDescription('')).toBe(true);
    expect(isFolderDescription('   ')).toBe(true);
    expect(isFolderDescription(`  ${'x'.repeat(FOLDER_LIMIT.DescriptionMax)}  `)).toBe(true);
  });

  it('rejects text that is too long, control characters and non-strings', () => {
    expect(isFolderDescription('x'.repeat(FOLDER_LIMIT.DescriptionMax + 1))).toBe(false);
    expect(isFolderDescription('a\u0000b')).toBe(false);
    expect(isFolderDescription('line\nbreak')).toBe(false);
    // Leading and trailing line breaks are trimmed away first.
    expect(isFolderDescription('\nTrimmed\n')).toBe(true);
    expect(isFolderDescription('del\u007f')).toBe(false);
    expect(isFolderDescription(null)).toBe(false);
    expect(isFolderDescription(42)).toBe(false);
  });
});

describe('normalizeFolderDescription', () => {
  it('trims, and turns blank text or null into null', () => {
    expect(normalizeFolderDescription('  Weekend reads ')).toBe('Weekend reads');
    expect(normalizeFolderDescription('   ')).toBeNull();
    expect(normalizeFolderDescription(null)).toBeNull();
  });
});
