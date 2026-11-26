import { describe, expect, it } from 'vitest';
import { stripControlChars } from './strip-control-chars';

describe('stripControlChars', () => {
  it('replaces controls with spaces', () => {
    expect(stripControlChars('a\u0000b\nc\u007fd')).toBe('a b c d');
    expect(stripControlChars('clean')).toBe('clean');
  });
});
