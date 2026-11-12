/**
 * The ids from `anchor` to `target` (both included) in the order of `order`, whichever comes first.
 * Just `[target]` when the anchor is not in the list any more (it was removed or filtered out).
 */
export function selectRange(
  order: readonly string[],
  anchor: string | null,
  target: string,
): string[] {
  const end = order.indexOf(target);
  const start = anchor === null ? -1 : order.indexOf(anchor);
  if (end < 0) {
    return [];
  }
  if (start < 0) {
    return [target];
  }
  return order.slice(Math.min(start, end), Math.max(start, end) + 1);
}
