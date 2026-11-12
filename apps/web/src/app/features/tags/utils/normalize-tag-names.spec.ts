import { normalizeTagNames } from './normalize-tag-names';

describe('normalizeTagNames', () => {
  it('turns spaces into hyphens and trims', () => {
    expect(normalizeTagNames([' winter sale ', 'a  b'])).toEqual(['winter-sale', 'a-b']);
  });

  it('drops empty names and duplicates ignoring case', () => {
    expect(normalizeTagNames(['docs', '  ', 'Docs', 'video'])).toEqual(['docs', 'video']);
  });

  it('keeps the case and the order', () => {
    expect(normalizeTagNames(['Zed', 'alpha'])).toEqual(['Zed', 'alpha']);
  });

  it('returns the same array when nothing changes', () => {
    const names = ['docs', 'video'];

    expect(normalizeTagNames(names)).toBe(names);
  });
});
