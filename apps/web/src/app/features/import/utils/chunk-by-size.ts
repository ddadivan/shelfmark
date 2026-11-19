/**
 * Splits items into chunks of at most `maxCount` items whose JSON stays near `maxBytes` (an item
 * larger than that still gets a chunk of its own), so every request fits the API's body limit.
 */
export function chunkBySize<T>(items: readonly T[], maxCount: number, maxBytes: number): T[][] {
  const chunks: T[][] = [];
  let current: T[] = [];
  let bytes = 0;
  for (const item of items) {
    const size = new TextEncoder().encode(JSON.stringify(item)).length + 1;
    if (current.length > 0 && (current.length >= maxCount || bytes + size > maxBytes)) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push(item);
    bytes += size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
