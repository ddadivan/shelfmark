import { ANY } from './any.const';
import { findDifference } from './find-difference';

describe('findDifference', () => {
  it('accepts equal values and ignores keys whose value is undefined', () => {
    expect(
      findDifference({ a: 1, b: [1, { c: 'x' }], d: undefined }, { a: 1, b: [1, { c: 'x' }] }),
    ).toBeNull();
  });

  it('reports a field the actual value adds or drops', () => {
    expect(findDifference({ a: 1, extra: 2 }, { a: 1 })).toBe(
      '$: fields differ (missing: [], unexpected: [extra])',
    );
    expect(findDifference({ a: 1 }, { a: 1, gone: 2 })).toBe(
      '$: fields differ (missing: [gone], unexpected: [])',
    );
  });

  it('reports the path of the first different value', () => {
    expect(findDifference({ a: [{ b: 1 }] }, { a: [{ b: 2 }] })).toBe(
      '$.a[0].b: expected 2, got 1',
    );
  });

  it('compares arrays in order and by length', () => {
    expect(findDifference([1, 2], [2, 1])).toBe('$[0]: expected 2, got 1');
    expect(findDifference([1], [1, 2])).toContain('expected 2 items, got 1');
  });

  it('tells null from a missing value and a string from a number', () => {
    expect(findDifference(null, 'x')).toBe('$: expected "x", got null');
    expect(findDifference('1', 1)).toBe('$: expected 1, got "1"');
    expect(findDifference(undefined, null)).toBe('$: expected null, got undefined');
  });

  it('lets the ANY placeholders stand for ids, timestamps and patterns', () => {
    const id = '018f0000-0000-7000-8000-0000000000a1';
    expect(
      findDifference({ id, at: '2026-01-02T03:04:05.678Z' }, { id: ANY.id, at: ANY.time }),
    ).toBeNull();
    expect(findDifference({ id: 'nope' }, { id: ANY.id })).toBe(
      '$.id: expected any id, got "nope"',
    );
    expect(findDifference('ab12', ANY.matching(/^[a-z]+\d+$/))).toBeNull();
    expect(findDifference('', ANY.text)).toContain('expected any non-empty string');
  });
});
