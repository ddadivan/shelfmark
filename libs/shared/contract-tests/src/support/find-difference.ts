import { isMatcher } from './is-matcher';

function show(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The first difference between `actual` and `expected` as a message with its path, or `null`.
 * Objects must have exactly the same keys (a key whose value is `undefined` counts as absent), so
 * a field one side adds or drops is reported; arrays compare in order; `ANY` placeholders match
 * by their own rule.
 */
export function findDifference(actual: unknown, expected: unknown, path = '$'): string | null {
  if (isMatcher(expected)) {
    return expected.test(actual)
      ? null
      : `${path}: expected ${expected.label}, got ${show(actual)}`;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return `${path}: expected an array, got ${show(actual)}`;
    }
    if (actual.length !== expected.length) {
      return `${path}: expected ${expected.length} items, got ${actual.length}: ${show(actual)}`;
    }
    for (let index = 0; index < expected.length; index++) {
      const difference = findDifference(actual[index], expected[index], `${path}[${index}]`);
      if (difference !== null) {
        return difference;
      }
    }
    return null;
  }
  if (isRecord(expected)) {
    if (!isRecord(actual)) {
      return `${path}: expected an object, got ${show(actual)}`;
    }
    const keys = (value: Record<string, unknown>): string[] =>
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort();
    const wanted = keys(expected);
    const got = keys(actual);
    const missing = wanted.filter((key) => !got.includes(key));
    const extra = got.filter((key) => !wanted.includes(key));
    if (missing.length > 0 || extra.length > 0) {
      return `${path}: fields differ (missing: [${missing.join(', ')}], unexpected: [${extra.join(', ')}])`;
    }
    for (const key of wanted) {
      const difference = findDifference(actual[key], expected[key], `${path}.${key}`);
      if (difference !== null) {
        return difference;
      }
    }
    return null;
  }
  return Object.is(actual, expected)
    ? null
    : `${path}: expected ${show(expected)}, got ${show(actual)}`;
}
