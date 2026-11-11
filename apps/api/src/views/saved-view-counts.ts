import { SAVED_VIEW_SCOPE, type SavedViewQuery } from '@shelfmark/contracts';
import { Prisma } from '../generated/prisma/client';
import { escapeLike } from '../common/util/escape-like';
import { searchTerms } from '../links/link-where';
import type { LinkDbClient } from '../links/models/link-db-client.type';
import type { SavedViewCounts } from './models/saved-view-counts.interface';

/**
 * The SQL twin of `buildLinkWhere` for one view, over the alias `l` of `links`: the same scope,
 * kind, tag (AND, case-insensitive, escaped) and search word (AND over title, note and URL, escaped)
 * rules. Every value is a bound parameter. `null` for a query that can match nothing (a folder view
 * without a folder).
 */
export function viewCondition(userId: string, query: SavedViewQuery): Prisma.Sql | null {
  const parts: Prisma.Sql[] = [];
  if (query.scope === SAVED_VIEW_SCOPE.Unsorted) parts.push(Prisma.sql`l."folder_id" IS NULL`);
  if (query.scope === SAVED_VIEW_SCOPE.Favorites) parts.push(Prisma.sql`l."is_favorite"`);
  if (query.scope === SAVED_VIEW_SCOPE.Folder) {
    if (query.folderId === null) return null;
    parts.push(Prisma.sql`l."folder_id" = ${query.folderId}::uuid`);
  }
  if (query.kind !== null) parts.push(Prisma.sql`l."kind" = ${query.kind}`);
  for (const name of query.tags) {
    parts.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "link_tags" lt JOIN "tags" t ON t."id" = lt."tag_id"
      WHERE lt."link_id" = l."id" AND t."user_id" = ${userId}::uuid AND t."name" ILIKE ${escapeLike(name)}
    )`);
  }
  for (const term of searchTerms(query.q === '' ? undefined : query.q)) {
    const pattern = `%${escapeLike(term)}%`;
    parts.push(
      Prisma.sql`(l."title" ILIKE ${pattern} OR l."note" ILIKE ${pattern} OR l."url" ILIKE ${pattern})`,
    );
  }
  return parts.length === 0 ? Prisma.sql`TRUE` : Prisma.join(parts, ' AND ');
}

/**
 * Live link counts of every view plus the total, in one grouped query (`COUNT(*) FILTER`) over the
 * user's live links. `null` entries (views that cannot be applied) count 0 without SQL.
 */
export async function countViews(
  db: LinkDbClient,
  userId: string,
  queries: readonly (SavedViewQuery | null)[],
): Promise<SavedViewCounts> {
  const conditions = queries.map((query) => (query === null ? null : viewCondition(userId, query)));
  const filters = conditions.map((condition) =>
    condition === null ? Prisma.sql`0` : Prisma.sql`(COUNT(*) FILTER (WHERE ${condition}))::int`,
  );
  const counts =
    filters.length === 0
      ? Prisma.sql`'{}'::int[]`
      : Prisma.sql`ARRAY[${Prisma.join(filters)}]::int[]`;
  const rows = await db.$queryRaw<{ total: number; counts: number[] }[]>`
    SELECT COUNT(*)::int AS "total", ${counts} AS "counts"
    FROM "links" l
    WHERE l."user_id" = ${userId}::uuid AND l."deleted_at" IS NULL
  `;
  const row = rows[0];
  return { total: row?.total ?? 0, counts: queries.map((_, index) => row?.counts[index] ?? 0) };
}
