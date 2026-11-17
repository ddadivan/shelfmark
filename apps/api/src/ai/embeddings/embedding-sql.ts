import { Prisma } from '../../generated/prisma/client';
import { EMBEDDING_LIMIT } from '../models/embedding-limit.const';
import type { AiDbClient } from '../models/ai-db-client.type';

/**
 * The predicate of the partial HNSW index (migration `ai_embeddings`): always true, repeated
 * verbatim by every KNN query so the planner may use the index. `e` is `link_embeddings`.
 */
export const HNSW_INDEX_PREDICATE = Prisma.sql`e.model <> ''`;

/**
 * A validated pgvector literal (`[0.1,-0.2,...]`) for a bound parameter cast with `::halfvec`:
 * exactly `EMBEDDING_LIMIT.Dimensions` finite numbers, else it throws (a provider answer is narrowed
 * before it gets here). Never interpolated into SQL text.
 */
export function toVectorLiteral(vector: readonly number[]): string {
  if (vector.length !== EMBEDDING_LIMIT.Dimensions) {
    throw new Error('Embedding has the wrong number of dimensions');
  }
  if (!vector.every((value) => Number.isFinite(value))) {
    throw new Error('Embedding has a non-finite value');
  }
  return `[${vector.join(',')}]`;
}

/**
 * Settings for the KNN queries of one transaction (ADR 0050 point 3): iterative index scans so the
 * per-user filter still returns enough rows from the global HNSW index, and a wider candidate list.
 */
export async function useHnswSettings(tx: AiDbClient): Promise<void> {
  await tx.$queryRaw`
    SELECT set_config('hnsw.iterative_scan', 'relaxed_order', true),
      set_config('hnsw.ef_search', '100', true)`;
}
