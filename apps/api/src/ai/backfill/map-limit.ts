/** Maps `items` with at most `concurrency` calls in flight; the results keep the input order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  concurrency: number,
  map: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await map(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
