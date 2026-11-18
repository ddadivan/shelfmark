import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { HNSW_INDEX_PREDICATE, useHnswSettings } from '../embeddings/embedding-sql';
import { AI_MEANING_LIMIT } from '../models/ai-meaning-limit.const';
import type { KnnHit } from '../models/knn-hit.interface';

/**
 * The user's live links nearest to a vector, best first (ADR 0050 point 3): only the session user's
 * rows of the current model, cosine distance through the HNSW index (its predicate is repeated), in
 * one transaction with iterative scans. The index scan runs alone in a materialized CTE ordered by
 * distance (no join the planner could move into it); trashed links are removed afterwards and the
 * CTE reads that many more rows (capped by `KnnFetchMax`), so they never shrink the
 * `KnnLimit` result. `target` is a bound vector literal or the stored vector of one of the user's
 * links (then that link is left out).
 */
export async function nearestLinks(
  prisma: PrismaService,
  userId: string,
  model: string,
  target: { vector: string } | { linkId: string },
): Promise<KnnHit[]> {
  const query =
    'vector' in target
      ? Prisma.sql`${target.vector}::halfvec`
      : Prisma.sql`(SELECT o.embedding FROM link_embeddings o
          WHERE o.link_id = ${target.linkId}::uuid AND o.user_id = ${userId}::uuid)`;
  const exclude =
    'linkId' in target ? Prisma.sql`AND e.link_id <> ${target.linkId}::uuid` : Prisma.empty;
  return prisma.$transaction(async (tx) => {
    await useHnswSettings(tx);
    return tx.$queryRaw<KnnHit[]>`
      WITH nearest AS MATERIALIZED (
        SELECT e.link_id, e.embedding <=> ${query} AS distance
        FROM link_embeddings e
        WHERE ${HNSW_INDEX_PREDICATE} AND e.user_id = ${userId}::uuid AND e.model = ${model}
          ${exclude}
        ORDER BY e.embedding <=> ${query}
        LIMIT LEAST(${AI_MEANING_LIMIT.KnnLimit}::int + (
          SELECT count(*)::int FROM links t JOIN link_embeddings te ON te.link_id = t.id
          WHERE t.user_id = ${userId}::uuid AND t.deleted_at IS NOT NULL
            AND te.user_id = ${userId}::uuid AND te.model = ${model}
        ), ${AI_MEANING_LIMIT.KnnFetchMax}::int)
      )
      SELECT n.link_id::text AS "linkId", (1 - n.distance)::float8 AS similarity
      FROM nearest n
      JOIN links l ON l.id = n.link_id AND l.user_id = ${userId}::uuid
      WHERE l.deleted_at IS NULL
      ORDER BY n.distance, n.link_id
      LIMIT ${AI_MEANING_LIMIT.KnnLimit}::int`;
  });
}
