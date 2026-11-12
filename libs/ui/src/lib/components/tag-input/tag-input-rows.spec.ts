import { describe, expect, it } from 'vitest';
import { TAG_MAX_LENGTH } from './models/tag-max-length.const';
import type { TagSuggestion } from './models/tag-suggestion.interface';
import { fillName, includesTag, normalizeTag, tagRows } from './tag-input-rows';

const SUGGESTIONS: TagSuggestion[] = [
  { name: 'signals', countLabel: '12 links' },
  { name: 'angular' },
  { name: 'design' },
  { name: 'forms signals' },
];
const CREATE = 'Create tag “{name}”';

describe('tag input rows', () => {
  it('trims and cuts text to the tag length', () => {
    expect(normalizeTag('  angular  ')).toBe('angular');
    expect(normalizeTag('a'.repeat(80))).toHaveLength(TAG_MAX_LENGTH);
    expect(normalizeTag('   ')).toBe('');
  });

  it('compares tags ignoring case', () => {
    expect(includesTag(['Angular'], 'angular')).toBe(true);
    expect(includesTag(['Angular'], 'design')).toBe(false);
  });

  it('fills the name literally', () => {
    expect(fillName('Remove tag {name}', 'a$&b')).toBe('Remove tag a$&b');
  });

  it('lists unused suggestions, starts-with first, and a create row for new text', () => {
    const rows = tagRows(SUGGESTIONS, ['design'], 'sig', false, CREATE);
    expect(rows.map((r) => r.label)).toEqual(['signals', 'forms signals', 'Create tag “sig”']);
    expect(rows[0]?.countLabel).toBe('12 links');
    expect(rows[2]?.create).toBe(true);
  });

  it('has no create row for an exact or added tag, or without a label', () => {
    expect(tagRows(SUGGESTIONS, [], 'Signals', false, CREATE).some((r) => r.create)).toBe(false);
    expect(tagRows(SUGGESTIONS, ['new'], 'NEW', false, CREATE)).toEqual([]);
    expect(tagRows(SUGGESTIONS, [], 'zzz', false, '')).toEqual([]);
  });

  it('offers nothing at the limit and caps the list', () => {
    expect(tagRows(SUGGESTIONS, [], 'a', true, CREATE)).toEqual([]);
    const many = Array.from({ length: 20 }, (_, i) => ({ name: `tag${i}` }));
    expect(tagRows(many, [], '', false, CREATE)).toHaveLength(8);
  });
});
