import { describe, expect, it } from 'vitest';
import { hasControlChars } from './has-control-chars';

describe('hasControlChars', () => {
  it('accepts ordinary text, including non-ASCII', () => {
    expect(hasControlChars('Plain title, ünï © 日本 😀')).toBe(false);
  });

  it.each(['\u0000', 'a\u0000b', '\u0001', '\u001f', '\u007f', 'a\tb', 'a\nb', 'a\rb'])(
    'rejects %j by default',
    (value) => {
      expect(hasControlChars(value)).toBe(true);
    },
  );

  it('keeps tab, LF and CR legal for text, but never NUL or other controls', () => {
    expect(hasControlChars('line 1\nline 2\r\n\tindented', true)).toBe(false);
    expect(hasControlChars('a\u0000b', true)).toBe(true);
    expect(hasControlChars('a\u001bb', true)).toBe(true);
    expect(hasControlChars('a\u007fb', true)).toBe(true);
  });
});
