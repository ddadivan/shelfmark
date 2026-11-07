import { describe, expect, it } from 'vitest';
import { ResettableThrottlerStorage } from './resettable-throttler-storage';

const LIMIT = 2;
const TTL = 60_000;

describe('ResettableThrottlerStorage', () => {
  it('counts hits per key like the real storage', async () => {
    const storage = new ResettableThrottlerStorage();
    expect((await storage.increment('k', TTL, LIMIT, TTL, 'default')).totalHits).toBe(1);
    expect((await storage.increment('k', TTL, LIMIT, TTL, 'default')).totalHits).toBe(2);
    expect((await storage.increment('other', TTL, LIMIT, TTL, 'default')).totalHits).toBe(1);
    storage.onApplicationShutdown();
  });

  it('reset() clears counters and blocks', async () => {
    const storage = new ResettableThrottlerStorage();
    await storage.increment('k', TTL, LIMIT, TTL, 'default');
    await storage.increment('k', TTL, LIMIT, TTL, 'default');
    const blocked = await storage.increment('k', TTL, LIMIT, TTL, 'default');
    expect(blocked.isBlocked).toBe(true);

    storage.reset();

    const fresh = await storage.increment('k', TTL, LIMIT, TTL, 'default');
    expect(fresh.totalHits).toBe(1);
    expect(fresh.isBlocked).toBe(false);
    storage.onApplicationShutdown();
  });

  it('keeps counting after a reset', async () => {
    const storage = new ResettableThrottlerStorage();
    storage.reset();
    expect((await storage.increment('k', TTL, LIMIT, TTL, 'default')).totalHits).toBe(1);
    expect((await storage.increment('k', TTL, LIMIT, TTL, 'default')).totalHits).toBe(2);
    storage.onApplicationShutdown();
  });
});
