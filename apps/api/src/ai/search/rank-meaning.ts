import { AI_MEANING_LIMIT } from '../models/ai-meaning-limit.const';
import type { KnnHit } from '../models/knn-hit.interface';

/**
 * The meaning matches worth showing, best first (ADR 0052 point 6): at or above the provider's
 * `minSimilarity` and within `AI_MEANING_LIMIT.RelativeWindow` of the best hit.
 */
export function rankMeaning(hits: readonly KnnHit[], minSimilarity: number): KnnHit[] {
  const sorted = [...hits].sort((a, b) => b.similarity - a.similarity);
  const best = sorted[0]?.similarity;
  if (best === undefined) return [];
  return sorted.filter(
    (hit) =>
      hit.similarity >= minSimilarity && hit.similarity >= best - AI_MEANING_LIMIT.RelativeWindow,
  );
}
