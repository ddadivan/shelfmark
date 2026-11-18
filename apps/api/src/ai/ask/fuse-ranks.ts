/** Reciprocal rank fusion constant (ADR 0051 point 3). */
const RRF_K = 60;

/**
 * Reciprocal rank fusion of ranked id lists: each id scores `1 / (k + rank)` per list it is in
 * (rank from 1); best first, ties in first-seen order; at most `max`.
 */
export function fuseRanks(lists: readonly (readonly string[])[], max: number): string[] {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, index) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + index + 1));
    });
  }
  return [...scores.entries()]
    .map(([id, score], order) => ({ id, score, order }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, max)
    .map((entry) => entry.id);
}
