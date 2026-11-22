import { pluralCategories, pluralKey } from './plural-key';

describe('pluralKey', () => {
  it('uses one and other in English', () => {
    expect(pluralKey('a.b', 1, 'en')).toBe('a.b.one');
    expect(pluralKey('a.b', 9, 'en')).toBe('a.b.other');
  });

  it('uses one, few, many in Ukrainian', () => {
    expect(pluralKey('a.b', 1, 'uk')).toBe('a.b.one');
    expect(pluralKey('a.b', 3, 'uk')).toBe('a.b.few');
    expect(pluralKey('a.b', 9, 'uk')).toBe('a.b.many');
    expect([...pluralCategories('uk')].sort()).toEqual(['few', 'many', 'one', 'other']);
  });
});
