import { describe, expect, it } from 'vitest';
import { escapeLike } from './escape-like';

describe('escapeLike', () => {
  it('leaves plain text alone', () => {
    expect(escapeLike('angular signals')).toBe('angular signals');
  });

  it('escapes the wildcards and the escape character', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
    expect(escapeLike('c:\\dir')).toBe('c:\\\\dir');
    expect(escapeLike('%_\\')).toBe('\\%\\_\\\\');
  });
});
