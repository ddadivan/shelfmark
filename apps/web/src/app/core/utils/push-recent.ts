/**
 * `item` moves to the front of a most-recent-first list, which keeps at most `max` entries.
 * `same` decides which entries count as `item` (default: `===`, e.g. pass a case-insensitive
 * comparison for text).
 */
export function pushRecent<T>(
  list: readonly T[],
  item: T,
  max: number,
  same: (a: T, b: T) => boolean = (a, b) => a === b,
): T[] {
  return [item, ...list.filter((entry) => !same(entry, item))].slice(0, max);
}
