import { computed } from '@angular/core';
import { setActiveLang } from './active-lang';
import { pluralCategories, pluralKey } from './plural-key';

describe('pluralKey', () => {
  afterEach(() => setActiveLang('en'));

  it('uses the English rule by default', () => {
    expect(pluralKey('links.count', 1)).toBe('links.count.one');
    expect(pluralKey('links.count', 0)).toBe('links.count.other');
    expect(pluralKey('links.count', 2)).toBe('links.count.other');
  });

  it('follows the active language', () => {
    setActiveLang('fr');
    expect(pluralKey('links.count', 0)).toBe('links.count.one');
    expect(pluralKey('links.count', 1_000_000)).toBe('links.count.many');
  });

  it('takes an explicit language', () => {
    expect(pluralKey('x', 1_000_000, 'es')).toBe('x.many');
    expect(pluralKey('x', 1_000_000, 'de')).toBe('x.other');
  });

  it('makes a computed re-run on a language switch', () => {
    const key = computed(() => pluralKey('x', 0));
    expect(key()).toBe('x.other');
    setActiveLang('fr');
    expect(key()).toBe('x.one');
  });

  it('lists the categories each language needs', () => {
    expect([...pluralCategories('en')].sort()).toEqual(['one', 'other']);
    expect([...pluralCategories('de')].sort()).toEqual(['one', 'other']);
    expect([...pluralCategories('pt')].sort()).toEqual(['many', 'one', 'other']);
  });
});
