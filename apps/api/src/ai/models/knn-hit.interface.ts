/** One nearest vector of the user's live links, with its cosine similarity (1 = same direction). */
export interface KnnHit {
  linkId: string;
  similarity: number;
}
