import { tagVariantKey } from './tag-variant-key';

describe('tagVariantKey', () => {
  it('ignores case, diacritics and separators', () => {
    expect(tagVariantKey('Front-End')).toBe(tagVariantKey('frontend'));
    expect(tagVariantKey('front_end')).toBe('frontend');
    expect(tagVariantKey('front end')).toBe('frontend');
    expect(tagVariantKey('node.js')).toBe('nodej');
    expect(tagVariantKey('Café')).toBe('cafe');
    expect(tagVariantKey('Crème brûlée')).toBe('cremebrulee');
  });

  it('drops one trailing plural s', () => {
    expect(tagVariantKey('recipes')).toBe('recipe');
    expect(tagVariantKey('Recipe')).toBe('recipe');
    expect(tagVariantKey('bookss')).toBe('bookss');
  });

  it('does not over-merge short tags or words ending in ss', () => {
    expect(tagVariantKey('news')).toBe('news');
    expect(tagVariantKey('new')).toBe('new');
    expect(tagVariantKey('css')).toBe('css');
    expect(tagVariantKey('class')).toBe('class');
    expect(tagVariantKey('js')).toBe('js');
  });

  it('answers an empty key for separators only', () => {
    expect(tagVariantKey('-_ .')).toBe('');
  });
});
