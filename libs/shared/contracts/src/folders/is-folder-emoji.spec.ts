import { describe, expect, it } from 'vitest';
import { isFolderEmoji } from './is-folder-emoji';

describe('isFolderEmoji', () => {
  it.each(['🍕', '🧑‍🍳', '👨‍👩‍👧‍👦', '👍🏽', '🇺🇦', '❤️', '1️⃣', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'])('accepts %s', (value) => {
    expect(isFolderEmoji(value)).toBe(true);
  });

  it.each([
    '',
    ' ',
    'a',
    '1',
    '©',
    '🍕🍕',
    '🍕 ',
    ' 🍕',
    'x🍕',
    '<🍕>',
    '🍕\u0000',
    '🍕\n',
    '🍕‍',
    '‍🍕',
    'ab',
    '🍕'.repeat(20),
  ])('rejects %j', (value) => {
    expect(isFolderEmoji(value)).toBe(false);
  });

  it('rejects anything that is not a string', () => {
    expect(isFolderEmoji(1)).toBe(false);
    expect(isFolderEmoji(null)).toBe(false);
    expect(isFolderEmoji(undefined)).toBe(false);
    expect(isFolderEmoji(['🍕'])).toBe(false);
  });
});
