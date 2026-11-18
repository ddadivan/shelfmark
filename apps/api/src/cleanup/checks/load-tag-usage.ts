import type { CleanupDbClient } from '../models/cleanup-db-client.type';
import type { TagUsage } from '../models/tag-usage.interface';

/**
 * The user's tags with their live-link counts, most used first (then oldest, then id). With `limit`,
 * only tags on at least one live link (what the model sees); without, every tag.
 */
export async function loadTagUsage(
  db: CleanupDbClient,
  userId: string,
  limit?: number,
): Promise<TagUsage[]> {
  const rows = await db.$queryRaw<TagUsage[]>`
    SELECT t.id::text AS id, t.name, count(l.id)::int AS links
    FROM tags t
    LEFT JOIN link_tags lt ON lt.tag_id = t.id
    LEFT JOIN links l ON l.id = lt.link_id AND l.user_id = t.user_id AND l.deleted_at IS NULL
    WHERE t.user_id = ${userId}::uuid
    GROUP BY t.id
    ORDER BY count(l.id) DESC, t.created_at, t.id
    LIMIT ${limit ?? 100_000}`;
  return limit === undefined ? rows : rows.filter((row) => row.links > 0);
}
