import { ConflictException } from '@nestjs/common';
import { LINK_ERROR_MESSAGE, linkCapFor, linkLimitMessage } from '@shelfmark/contracts';
import type { LinkDbClient } from './models/link-db-client.type';

/**
 * How many more links the account can hold. Trash counts (ADR 0036): delete-and-add cannot grow the
 * table past the cap. Callers that must not race take the `folders:` lock first.
 */
export async function linkRoom(db: LinkDbClient, userId: string, isDemo: boolean): Promise<number> {
  return linkCapFor(isDemo) - (await db.link.count({ where: { userId } }));
}

/**
 * 409 when `adding` more links do not fit the cap that applies. The message is the endpoint's
 * contract: `'single'` (create one) answers `LimitReached` / `DemoLimitReached`, `'room'` (batch)
 * answers `linkLimitMessage(room)`, which names how many still fit.
 */
export async function assertLinkQuotaFits(
  db: LinkDbClient,
  userId: string,
  adding: number,
  isDemo: boolean,
  message: 'single' | 'room',
): Promise<void> {
  const room = await linkRoom(db, userId, isDemo);
  if (adding <= room) return;
  throw new ConflictException(
    message === 'room'
      ? linkLimitMessage(room)
      : isDemo
        ? LINK_ERROR_MESSAGE.DemoLimitReached
        : LINK_ERROR_MESSAGE.LimitReached,
  );
}
