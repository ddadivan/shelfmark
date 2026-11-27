/** The item at `index`, or a failed test when there is none (instead of a `!` assertion in specs). */
export function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`Expected an item at index ${index}`);
  return item;
}
