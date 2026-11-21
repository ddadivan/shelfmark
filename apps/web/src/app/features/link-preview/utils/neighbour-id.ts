/**
 * The id `step` places away from `id` in `ids` (the feed order), or `null` at either end or when
 * `id` is not in the list (#553: ↑ / ↓ and the toolbar arrows).
 */
export function neighbourId(
  ids: readonly string[],
  id: string | null,
  step: number,
): string | null {
  if (id === null) {
    return null;
  }
  const index = ids.indexOf(id);
  if (index === -1) {
    return null;
  }
  return ids[index + step] ?? null;
}
