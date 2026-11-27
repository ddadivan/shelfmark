import { ConflictException } from '@nestjs/common';
import { DEMO_LIMIT, LINK_ERROR_MESSAGE, LINK_LIMIT, linkLimitMessage } from '@shelfmark/contracts';
import { describe, expect, it, vi } from 'vitest';
import { assertLinkQuotaFits, linkRoom } from './link-quota';
import type { LinkDbClient } from './models/link-db-client.type';

function dbWithTotal(total: number): LinkDbClient {
  return { link: { count: vi.fn().mockResolvedValue(total) } } as unknown as LinkDbClient;
}

describe('linkRoom', () => {
  it('is the cap that applies minus every row, trashed ones included', async () => {
    const db = dbWithTotal(7);
    expect(await linkRoom(db, 'u', false)).toBe(LINK_LIMIT.PerUserMax - 7);
    expect(await linkRoom(db, 'u', true)).toBe(DEMO_LIMIT.MaxLinks - 7);
    expect(db.link.count).toHaveBeenCalledWith({ where: { userId: 'u' } });
  });
});

describe('assertLinkQuotaFits', () => {
  it('accepts links that fit exactly', async () => {
    await expect(
      assertLinkQuotaFits(dbWithTotal(LINK_LIMIT.PerUserMax - 2), 'u', 2, false, 'room'),
    ).resolves.toBeUndefined();
  });

  it('single: a full account is LimitReached, a full sandbox DemoLimitReached', async () => {
    await expect(
      assertLinkQuotaFits(dbWithTotal(LINK_LIMIT.PerUserMax), 'u', 1, false, 'single'),
    ).rejects.toThrow(new ConflictException(LINK_ERROR_MESSAGE.LimitReached));
    await expect(
      assertLinkQuotaFits(dbWithTotal(DEMO_LIMIT.MaxLinks), 'u', 1, true, 'single'),
    ).rejects.toThrow(new ConflictException(LINK_ERROR_MESSAGE.DemoLimitReached));
  });

  it('room: names how many still fit, never below 0', async () => {
    await expect(
      assertLinkQuotaFits(dbWithTotal(DEMO_LIMIT.MaxLinks - 3), 'u', 5, true, 'room'),
    ).rejects.toThrow(new ConflictException(linkLimitMessage(3)));
    await expect(
      assertLinkQuotaFits(dbWithTotal(DEMO_LIMIT.MaxLinks + 4), 'u', 1, true, 'room'),
    ).rejects.toThrow(new ConflictException(linkLimitMessage(0)));
  });
});
