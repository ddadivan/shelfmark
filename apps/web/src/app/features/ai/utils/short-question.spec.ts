import { shortQuestion } from './short-question';

describe('shortQuestion', () => {
  it('keeps a short question whole, spaces tidied', () => {
    expect(shortQuestion('  ramen   recipes ', 40)).toBe('ramen recipes');
  });

  it('cuts a long question at the last word boundary and adds an ellipsis', () => {
    expect(shortQuestion('в какой ссылке рассказывают про декораторы и как они работают', 40)).toBe(
      'в какой ссылке рассказывают про…',
    );
  });

  it('cuts one long word at the limit', () => {
    expect(shortQuestion('a'.repeat(60), 40)).toBe(`${'a'.repeat(40)}…`);
  });

  it('drops trailing punctuation before the ellipsis', () => {
    expect(shortQuestion('which links, about Angular signals, did I save last week?', 20)).toBe(
      'which links, about…',
    );
  });

  it('counts characters, not UTF-16 units, so an emoji is never split', () => {
    expect(shortQuestion('🍜'.repeat(45), 40)).toBe(`${'🍜'.repeat(40)}…`);
  });
});
