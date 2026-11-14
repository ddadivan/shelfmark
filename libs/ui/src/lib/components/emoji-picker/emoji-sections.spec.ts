import { categorySections, emojiSection, keptCategory, resultsSection } from './emoji-sections';
import type { EmojiPickerCategory } from './models/emoji-picker-category.interface';

const FOOD: EmojiPickerCategory = {
  id: 'food',
  label: 'Food',
  items: Array.from({ length: 10 }, (_, i) => ({
    emoji: String.fromCodePoint(0x1f354 + i),
    name: i === 0 ? 'hamburger' : `food ${i}`,
  })),
};
const ANIMALS: EmojiPickerCategory = { id: 'animals', label: 'Animals', items: [] };

describe('emoji sections', () => {
  it('builds a section in rows of eight with a prefixed heading id', () => {
    const section = emojiSection('p', 'food', 'Food', FOOD.items, true);
    expect(section.headingId).toBe('p-food');
    expect(section.rows.map((row) => row.length)).toEqual([8, 2]);
    expect(section.removable).toBe(true);
    expect(emojiSection('p', 'x', 'X', []).removable).toBe(false);
  });

  it('puts Recent and Yours above the category and drops empty ones', () => {
    const recent = { label: 'Recent', items: [{ emoji: '🍕', name: 'pizza' }] };
    const own = { label: 'Yours', items: [] };
    expect(categorySections('p', FOOD, recent, own).map((s) => [s.label, s.headingId])).toEqual([
      ['Recent', 'p-food-recent'],
      ['Food', 'p-food'],
    ]);
    const mine = { label: 'Yours', items: [{ emoji: '🦩', name: '🦩' }] };
    const sections = categorySections('p', FOOD, { label: 'Recent', items: [] }, mine);
    expect(sections.map((s) => s.removable)).toEqual([true, false]);
    expect(categorySections('p', ANIMALS, { label: 'R', items: [] }, own)).toEqual([]);
  });

  it('makes the results section from the search', () => {
    const section = resultsSection('p', 'Results', [FOOD], 'hamb', []);
    expect(section.headingId).toBe('p-results');
    expect(section.rows.flat().map((item) => item.name)).toEqual(['hamburger']);
    expect(resultsSection('p', 'Results', [FOOD], '', []).rows).toEqual([]);
  });

  it('keeps the chosen tab while it exists', () => {
    expect(keptCategory([FOOD, ANIMALS], 'animals')).toBe('animals');
    expect(keptCategory([FOOD, ANIMALS], 'gone')).toBe('food');
    expect(keptCategory([FOOD], undefined)).toBe('food');
    expect(keptCategory([], 'food')).toBeUndefined();
  });
});
