import type { AiDbClient } from '../models/ai-db-client.type';
import type { StaleTarget } from '../models/stale-target.type';

/**
 * Flags the user's vectors of these links (or of the links carrying these tags) as `stale`, so the
 * next embed pass rebuilds them (ADR 0050 point 4). One set-based statement on the session user's
 * rows only: ids of another user change nothing. Every write path that changes a link's title, note,
 * tags or summary calls it on its transaction (tag deletes and merges before the tag rows go).
 * `updated_at` moves too, so a pass that read the old text keeps the flag.
 */
export async function markEmbeddingsStale(
  db: AiDbClient,
  userId: string,
  target: StaleTarget,
): Promise<number> {
  if ('linkIds' in target) {
    if (target.linkIds.length === 0) return 0;
    return db.$executeRaw`
      UPDATE link_embeddings SET stale = true, updated_at = clock_timestamp()
      WHERE user_id = ${userId}::uuid AND link_id = ANY(${[...target.linkIds]}::uuid[])`;
  }
  if (target.tagIds.length === 0) return 0;
  return db.$executeRaw`
    UPDATE link_embeddings SET stale = true, updated_at = clock_timestamp()
    WHERE user_id = ${userId}::uuid AND link_id IN (
      SELECT lt.link_id FROM link_tags lt JOIN tags t ON t.id = lt.tag_id
      WHERE t.user_id = ${userId}::uuid AND lt.tag_id = ANY(${[...target.tagIds]}::uuid[]))`;
}
