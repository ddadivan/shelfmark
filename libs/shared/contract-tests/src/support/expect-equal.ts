import { findDifference } from './find-difference';

/** Fails with the path of the first difference unless `actual` matches `expected` (see `findDifference`). */
export function expectEqual(actual: unknown, expected: unknown, what = 'value'): void {
  const difference = findDifference(actual, expected);
  if (difference !== null) {
    throw new Error(`${what} differs: ${difference}`);
  }
}
