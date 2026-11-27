import { NotFoundException } from '@nestjs/common';
import { LINK_ERROR_MESSAGE } from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';

/** Anything with the `link` delegate: the Prisma service or a transaction client. */
export type LinkLookupClient = Pick<Prisma.TransactionClient, 'link'>;

/** The `select` or `include` of the row to read (one of them, like Prisma). */
export interface LinkLookupArgs {
  select?: Prisma.LinkSelect;
  include?: Prisma.LinkInclude;
}

export interface LinkLookupOptions {
  /** Read a trashed link too (default: live links only, ADR 0036). */
  includeTrashed?: boolean;
}

/**
 * The one ownership rule for object lookups: a missing row (foreign, missing or trashed objects all
 * look alike, because the query already filtered by the session user) is a 404 with `message`,
 * never a 403.
 */
export function requireOwnedOr404<T>(row: T | null | undefined, message: string): T {
  if (row === null || row === undefined) throw new NotFoundException(message);
  return row;
}

/**
 * The session user's link `linkId`, else a 404 (`LINK_ERROR_MESSAGE.NotFound`). Live links only
 * unless `options.includeTrashed`; `userId` always comes from the session.
 */
export async function requireLiveLink<A extends LinkLookupArgs>(
  db: LinkLookupClient,
  userId: string,
  linkId: string,
  args: A,
  options: LinkLookupOptions = {},
): Promise<Prisma.LinkGetPayload<A>> {
  const row = await db.link.findFirst({
    where: options.includeTrashed
      ? { id: linkId, userId }
      : { id: linkId, userId, deletedAt: null },
    ...args,
  });
  return requireOwnedOr404(row, LINK_ERROR_MESSAGE.NotFound) as Prisma.LinkGetPayload<A>;
}
