import type { EmbedOutcome } from './embed-outcome.type';
import type { EmbeddingInputType } from './embedding-input-type.type';

/**
 * The server-side seam to an embedding model (ADR 0050 point 1), separate from `AiProvider`; the web
 * app never sees these shapes. `embed` never throws and never logs the texts, the vectors or the key.
 */
export interface EmbeddingProvider {
  /** Provider name for logs (`voyage`, `mock`). */
  readonly name: string;
  /** Stored with each vector (`link_embeddings.model`): a vector of another model is re-embedded. */
  readonly model: string;
  /** Vector length; always `EMBEDDING_LIMIT.Dimensions` (the column is `halfvec(1024)`). */
  readonly dimensions: number;
  /** Cosine similarity below which a meaning match is dropped (per provider and corpus). */
  readonly minSimilarity: number;
  embed(texts: readonly string[], inputType: EmbeddingInputType): Promise<EmbedOutcome>;
}
