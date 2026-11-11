import { LINK_LIMIT } from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';
import { escapeLike } from '../common/util/escape-like';
import type { LinkFilter } from './models/link-filter.interface';

/** The words of a search text: split on whitespace, at most `LINK_LIMIT.QueryTermsMax` are used. */
export function searchTerms(q: string | undefined): string[] {
  if (q === undefined) return [];
  return q.split(/\s+/).filter(Boolean).slice(0, LINK_LIMIT.QueryTermsMax);
}

function termCondition(term: string): Prisma.LinkWhereInput {
  const escaped = escapeLike(term);
  return {
    OR: [
      { title: { contains: escaped, mode: 'insensitive' } },
      { note: { contains: escaped, mode: 'insensitive' } },
      { url: { contains: escaped, mode: 'insensitive' } },
    ],
  };
}

/**
 * The `where` of a link query. `userId` always comes first and is never optional: every caller
 * passes the session user. Trashed links are never matched (ADR 0036). All parts are combined with AND.
 */
export function buildLinkWhere(userId: string, filter: LinkFilter): Prisma.LinkWhereInput {
  const and: Prisma.LinkWhereInput[] = [];
  if (filter.unsorted === true) and.push({ folderId: null });
  else if (filter.folderId !== undefined) and.push({ folderId: filter.folderId });
  if (filter.favorite !== undefined) and.push({ isFavorite: filter.favorite });
  if (filter.kind !== undefined) and.push({ kind: filter.kind });
  for (const name of filter.tag ?? []) {
    and.push({
      tags: { some: { tag: { userId, name: { equals: escapeLike(name), mode: 'insensitive' } } } },
    });
  }
  for (const term of searchTerms(filter.q)) and.push(termCondition(term));
  return { userId, deletedAt: null, AND: and };
}
