import { emojiRows, loneEmoji, normalizeSearch, searchEmoji } from './emoji-search';
import type { EmojiPickerCategory } from './models/emoji-picker-category.interface';

const CATEGORIES: EmojiPickerCategory[] = [
  {
    id: 'food',
    label: 'Food',
    items: [
      { emoji: '🍕', name: 'pizza', keywords: ['cheese', 'slice'] },
      { emoji: '☕', name: 'café chaud', keywords: ['boisson'] },
    ],
  },
  {
    id: 'animals',
    label: 'Animals',
    items: [
      { emoji: '🐶', name: 'dog face', keywords: ['pet'] },
      { emoji: '🍕', name: 'pizza again' },
    ],
  },
];

describe('emoji search', () => {
  it('normalizes case and accents', () => {
    expect(normalizeSearch('  Café ')).toBe('cafe');
  });

  it('finds by word starts of names and keywords, every term, each emoji once', () => {
    expect(searchEmoji(CATEGORIES, 'piz').map((item) => item.emoji)).toEqual(['🍕']);
    expect(searchEmoji(CATEGORIES, 'CHEE').map((item) => item.emoji)).toEqual(['🍕']);
    expect(searchEmoji(CATEGORIES, 'cafe').map((item) => item.emoji)).toEqual(['☕']);
    expect(searchEmoji(CATEGORIES, 'dog pet').map((item) => item.emoji)).toEqual(['🐶']);
    expect(searchEmoji(CATEGORIES, 'dog cheese')).toEqual([]);
    expect(searchEmoji(CATEGORIES, 'izza')).toEqual([]);
    expect(searchEmoji(CATEGORIES, '   ')).toEqual([]);
  });

  it('puts a pasted emoji first, named when it is known', () => {
    expect(searchEmoji(CATEGORIES, '🐶')).toEqual([
      { emoji: '🐶', name: 'dog face', keywords: ['pet'] },
    ]);
    expect(searchEmoji(CATEGORIES, '🦩')).toEqual([{ emoji: '🦩', name: '🦩' }]);
    expect(searchEmoji(CATEGORIES, '🦩', [{ emoji: '🦩', name: 'own' }])).toEqual([
      { emoji: '🦩', name: 'own' },
    ]);
  });

  it('knows a lone emoji', () => {
    expect(loneEmoji(' 🧑‍🍳 ')).toBe('🧑‍🍳');
    expect(loneEmoji('🇺🇦')).toBe('🇺🇦');
    expect(loneEmoji('🍕🍔')).toBeNull();
    expect(loneEmoji('a')).toBeNull();
    expect(loneEmoji('')).toBeNull();
  });

  it('splits into rows', () => {
    expect(emojiRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(emojiRows([], 8)).toEqual([]);
  });
});
