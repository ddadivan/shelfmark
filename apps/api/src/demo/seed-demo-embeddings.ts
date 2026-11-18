import { buildEmbeddingText, embeddingTextHash } from '../ai/embeddings/build-embedding-text';
import { toVectorLiteral } from '../ai/embeddings/embedding-sql';
import type { EmbeddingTextInput } from '../ai/models/embedding-text-input.interface';
import { MOCK_EMBEDDING_LIMIT } from '../ai/models/mock-embedding-limit.const';
import { mockVector } from '../ai/providers/mock-embedding.provider';
import type { Prisma } from '../generated/prisma/client';

/**
 * Search by meaning for a new demo sandbox (AI-3): one vector per seed link from the deterministic
 * mock (demo users never get the real provider), built from the same text the embed pass would
 * build, so the pass finds nothing to do. One set-based insert in the seed transaction; vectors are
 * bound parameters cast to `halfvec`.
 */
export async function seedDemoEmbeddings(
  tx: Prisma.TransactionClient,
  userId: string,
  links: readonly (EmbeddingTextInput & { id: string })[],
  includeNotes: boolean,
): Promise<void> {
  if (links.length === 0) return;
  const rows = links.map((link) => {
    const text = buildEmbeddingText(link, includeNotes);
    return {
      id: link.id,
      hash: embeddingTextHash(text),
      vector: toVectorLiteral(mockVector(text)),
    };
  });
  await tx.$executeRaw`
    INSERT INTO link_embeddings (link_id, user_id, model, with_note, input_hash, embedding)
    SELECT v.id, ${userId}::uuid, ${MOCK_EMBEDDING_LIMIT.Model}, ${includeNotes}, v.hash,
      v.vector::halfvec
    FROM unnest(
      ${rows.map((row) => row.id)}::uuid[],
      ${rows.map((row) => row.hash)}::text[],
      ${rows.map((row) => row.vector)}::text[]
    ) AS v(id, hash, vector)`;
}
