import { SAVED_WITHIN_DAYS, searchTerms } from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';
import { escapeLike } from '../common/util/escape-like';
import type { LinkFilter } from './models/link-filter.interface';
import type { LinkWhereOptions } from './models/link-where-options.interface';

function termCondition(term: string, searchNotes: boolean): Prisma.LinkWhereInput {
  const escaped = escapeLike(term);
  return {
    OR: [
      { title: { contains: escaped, mode: 'insensitive' } },
      ...(searchNotes ? [{ note: { contains: escaped, mode: 'insensitive' as const } }] : []),
      { url: { contains: escaped, mode: 'insensitive' } },
    ],
  };
}

/**
 * The `where` of a link query. `userId` always comes first and is never optional: every caller
 * passes the session user. Trashed links are never matched (ADR 0036). All parts are combined with AND.
 * The search text matches title, note and URL; `options.searchNotes: false` leaves the note out (an
 * MCP token without "Include my notes" must not learn note contents from which links match, ADR 0054).
 */
export function buildLinkWhere(
  userId: string,
  filter: LinkFilter,
  options: LinkWhereOptions = {},
): Prisma.LinkWhereInput {
  const searchNotes = options.searchNotes ?? true;
  const and: Prisma.LinkWhereInput[] = [];
  if (filter.unsorted === true) and.push({ folderId: null });
  else if (filter.folderId !== undefined) and.push({ folderId: filter.folderId });
  if (filter.favorite !== undefined) and.push({ isFavorite: filter.favorite });
  if (filter.kind !== undefined) and.push({ kind: filter.kind });
  if (filter.saved !== undefined) {
    const now = options.now ?? new Date();
    const days = SAVED_WITHIN_DAYS[filter.saved];
    and.push({ createdAt: { gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) } });
  }
  for (const name of filter.tag ?? []) {
    and.push({
      tags: { some: { tag: { userId, name: { equals: escapeLike(name), mode: 'insensitive' } } } },
    });
  }
  for (const term of searchTerms(filter.q)) and.push(termCondition(term, searchNotes));
  return { userId, deletedAt: null, AND: and };
}
