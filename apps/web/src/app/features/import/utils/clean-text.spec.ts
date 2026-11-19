import { cleanLine, cleanNote } from './clean-text';

describe('cleanLine', () => {
  it('collapses whitespace, replaces control characters and cuts', () => {
    expect(cleanLine('  a\u0000b\tc\n d  ', 100)).toBe('a b c d');
    expect(cleanLine('abcdef', 3)).toBe('abc');
    expect(cleanLine(null, 10)).toBe('');
  });
});

describe('cleanNote', () => {
  it('keeps single newlines, folds long gaps and control characters', () => {
    expect(cleanNote(' one\r\ntwo\u0007\n\n\n\nthree ', 100)).toBe('one\ntwo \n\nthree');
    expect(cleanNote(undefined, 10)).toBe('');
    expect(cleanNote('abcdef', 4)).toBe('abcd');
  });
});
