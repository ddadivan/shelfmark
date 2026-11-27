/**
 * Cuts a keyset page out of rows read with `take: limit + 1`: the extra row only tells that another
 * page exists and is never returned. `encode` turns the last returned row into the opaque cursor
 * (each domain keeps its own codec); `nextCursor` is `null` on the last page.
 */
export function paginate<T>(
  rows: readonly T[],
  limit: number,
  encode: (last: T) => string,
): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > limit && last !== undefined ? encode(last) : null,
  };
}
