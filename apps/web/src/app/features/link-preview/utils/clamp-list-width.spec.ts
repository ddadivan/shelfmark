import { describe, expect, it } from 'vitest';
import { clampListWidth } from './clamp-list-width';

describe('clampListWidth', () => {
  it('keeps the width in range', () => {
    expect(clampListWidth(450.4)).toBe(450);
    expect(clampListWidth('100')).toBe(300);
    expect(clampListWidth(9999)).toBe(640);
  });

  it('falls back to the default', () => {
    expect(clampListWidth(null)).toBe(400);
    expect(clampListWidth('wide')).toBe(400);
  });
});
