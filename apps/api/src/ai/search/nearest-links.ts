import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { HNSW_INDEX_PREDICATE, useHnswSettings } from '../embeddings/embedding-sql';
import { AI_MEANING_LIMIT } from '../models/ai-meaning-limit.const';
import type { KnnHit } from '../models/knn-hit.interface';

/**
 * The user's live links nearest to a vector (ADR 0050 point 3): only the session user's rows of the
 * current model, trashed links excluded, cosine distance through the HNSW index (its predicate is
 * repeated), in one transaction with iterative scans. `target` is a bound vector literal or the
 * stored vector of one of the user's links (then that link is left out).
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
      SELECT e.link_id::text AS "linkId", (1 - (e.embedding <=> ${query}))::float8 AS similarity
      FROM link_embeddings e
      JOIN links l ON l.id = e.link_id AND l.user_id = e.user_id
      WHERE ${HNSW_INDEX_PREDICATE} AND e.user_id = ${userId}::uuid AND e.model = ${model}
        AND l.deleted_at IS NULL ${exclude}
      ORDER BY e.embedding <=> ${query}
      LIMIT ${AI_MEANING_LIMIT.KnnLimit}`;
  });
}
