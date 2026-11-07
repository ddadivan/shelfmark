import { normalizeTagName } from './normalize-tag-name';

describe('normalizeTagName', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeTagName('  docs  ')).toBe('docs');
  });

  it('turns runs of spaces, tabs and newlines into one hyphen', () => {
    expect(normalizeTagName('a  b\t\tc\n\nd \t\n e')).toBe('a-b-c-d-e');
  });

  it('returns an empty string for whitespace only', () => {
    expect(normalizeTagName(' \t\n ')).toBe('');
  });

  it('keeps the case', () => {
    expect(normalizeTagName('Read Later')).toBe('Read-Later');
  });

  it('keeps an already hyphenated name', () => {
    expect(normalizeTagName('read-later')).toBe('read-later');
  });

  it('does not truncate a 51-character name', () => {
    const name = 'a'.repeat(51);
    expect(normalizeTagName(name)).toBe(name);
  });
});
