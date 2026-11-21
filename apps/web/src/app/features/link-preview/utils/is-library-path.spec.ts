import { describe, expect, it } from 'vitest';
import { isLibraryPath } from './is-library-path';

describe('isLibraryPath', () => {
  it('knows the library feeds', () => {
    expect(isLibraryPath('/links')).toBe(true);
    expect(isLibraryPath('/unsorted/')).toBe(true);
    expect(isLibraryPath('/favorites')).toBe(true);
    expect(isLibraryPath('/folders/abc')).toBe(true);
  });

  it('refuses every other page', () => {
    expect(isLibraryPath('/unsorted/tidy')).toBe(false);
    expect(isLibraryPath('/recent')).toBe(false);
    expect(isLibraryPath('/folders')).toBe(false);
    expect(isLibraryPath('/settings/library')).toBe(false);
  });
});
