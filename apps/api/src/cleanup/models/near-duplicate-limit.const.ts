/**
 * Near-duplicates (ADR 0053 point 2, plan 1.3): the `NeighboursPerLink` nearest own live links of
 * each link with a vector count when cosine similarity is at least `SimilarityMin` and the hosts are
 * one family or the title stems overlap by at least `TitleOverlapMin` (Jaccard).
 */
export const NEAR_DUPLICATE_LIMIT = {
  SimilarityMin: 0.93,
  TitleOverlapMin: 0.6,
  NeighboursPerLink: 3,
} as const;
