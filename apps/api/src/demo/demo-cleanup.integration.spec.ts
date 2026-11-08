import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { resolve } from 'node:path';
import type { DemoCleanupResponse } from './models/demo-cleanup-response.interface';
import request from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { signInDemo } from '../../test-utils/sign-in-demo';
import { DemoCleanupService } from './demo-cleanup.service';
import { CRON_ENV } from './models/cron-env.const';
import { CRON_ROUTE } from './models/cron-route.const';
import { DEMO_CLEANUP_LIMITS } from './models/demo-cleanup-limits.const';

// Random per run, like every other test secret: nothing to leak.
const SECRET = randomBytes(24).toString('hex');
const HOUR_MS = 60 * 60 * 1000;

describe('GET /api/cron/demo-cleanup', () => {
  let t: AuthTestApp;

  beforeAll(async () => {
    t = await createAuthTestApp({ env: { [CRON_ENV.Secret]: SECRET } });
  });

  afterEach(async () => {
    process.env[CRON_ENV.Secret] = SECRET;
    await t.db.truncateAll();
    resetRateLimits(t.app);
  });

  afterAll(async () => {
    await t.close();
  });

  const call = (authorization?: string) => {
    const req = request(t.app.getHttpServer()).get(CRON_ROUTE.Path);
    return authorization === undefined ? req : req.set('Authorization', authorization);
  };

  const expire = (ids: string[], by = HOUR_MS) =>
    t.db.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { demoExpiresAt: new Date(Date.now() - by) },
    });

  const rowCounts = async () => ({
    users: await t.db.prisma.user.count(),
    sessions: await t.db.prisma.session.count(),
    accounts: await t.db.prisma.account.count(),
    folders: await t.db.prisma.folder.count(),
    links: await t.db.prisma.link.count(),
    tags: await t.db.prisma.tag.count(),
    linkTags: await t.db.prisma.linkTag.count(),
  });

  it('has the vercel.json cron path of the route', () => {
    const config: unknown = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../../../vercel.json'), 'utf8'),
    );
    const crons = (config as { crons?: { path: string; schedule: string }[] }).crons ?? [];
    expect(crons.map((cron) => cron.path)).toEqual([CRON_ROUTE.Path]);
    // Hobby allows one run per day: a fixed minute and hour, nothing more frequent.
    expect(crons[0]?.schedule).toMatch(/^\d{1,2} \d{1,2} \* \* \*$/);
  });

  describe('authentication', () => {
    it.each([
      ['no header', undefined],
      ['a wrong secret', 'Bearer wrong'],
      ['an empty bearer', 'Bearer '],
      ['the wrong scheme', `Basic ${SECRET}`],
    ])('answers 401 for %s and deletes nothing', async (_label, header) => {
      const demo = await signInDemo(t.app, t.baseUrl);
      await expire([demo.userId]);
      const res = await call(header).expect(401);
      expect(res.body).toMatchObject({ statusCode: 401 });
      expect(await t.db.prisma.user.count()).toBe(1);
    });

    it('answers 401 to everyone when CRON_SECRET is unset or too short', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      await expire([demo.userId]);
      delete process.env[CRON_ENV.Secret];
      await call('Bearer ').expect(401);
      await call(`Bearer ${SECRET}`).expect(401);
      process.env[CRON_ENV.Secret] = 'short';
      await call('Bearer short').expect(401);
      expect(await t.db.prisma.user.count()).toBe(1);
    });

    it('does not accept a session cookie instead of the secret', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      await request(t.app.getHttpServer())
        .get(CRON_ROUTE.Path)
        .set('Cookie', demo.cookie)
        .expect(401);
    });

    it('does not answer other methods', async () => {
      for (const method of ['post', 'put', 'delete'] as const) {
        const res = await request(t.app.getHttpServer())
          [method](CRON_ROUTE.Path)
          .set('Origin', t.baseUrl)
          .set('Authorization', `Bearer ${SECRET}`);
        expect([404, 405]).toContain(res.status);
      }
    });
  });

  describe('cleanup', () => {
    it('answers 200 with the count, no-store and nothing else', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      await expire([demo.userId]);
      const res = await call(`Bearer ${SECRET}`).expect(200);
      expect(res.body).toEqual({ deleted: 1, hasMore: false });
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('deletes only expired demo users: live demo and regular users stay, even when past the date', async () => {
      const expired = await signInDemo(t.app, t.baseUrl);
      const live = await signInDemo(t.app, t.baseUrl);
      const regular = await t.db.prisma.user.create({
        data: { name: 'R', email: 'r@example.test', demoExpiresAt: new Date(Date.now() - HOUR_MS) },
      });
      await seedLink(t.db.prisma, regular.id);
      await expire([expired.userId]);

      const res = await call(`Bearer ${SECRET}`).expect(200);
      expect((res.body as DemoCleanupResponse).deleted).toBe(1);

      const left = await t.db.prisma.user.findMany({ select: { id: true } });
      expect(left.map((user) => user.id).sort()).toEqual([live.userId, regular.id].sort());
      expect(await t.db.prisma.link.count({ where: { userId: regular.id } })).toBe(1);
      expect(await t.db.prisma.link.count({ where: { userId: live.userId } })).toBeGreaterThan(0);
    });

    it('removes every row the sandbox owned: zero rows left in all tables', async () => {
      const first = await signInDemo(t.app, t.baseUrl);
      const second = await signInDemo(t.app, t.baseUrl);
      // An account row too, as an upgraded demo user would have.
      await t.db.prisma.account.create({
        data: { accountId: 'a1', providerId: 'github', userId: first.userId },
      });
      expect((await rowCounts()).links).toBeGreaterThan(0);
      await expire([first.userId, second.userId]);

      await call(`Bearer ${SECRET}`).expect(200);
      expect(await rowCounts()).toEqual({
        users: 0,
        sessions: 0,
        accounts: 0,
        folders: 0,
        links: 0,
        tags: 0,
        linkTags: 0,
      });
    });

    it('is idempotent: a second run finds nothing', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      await expire([demo.userId]);
      expect((await call(`Bearer ${SECRET}`).expect(200)).body).toEqual({
        deleted: 1,
        hasMore: false,
      });
      expect((await call(`Bearer ${SECRET}`).expect(200)).body).toEqual({
        deleted: 0,
        hasMore: false,
      });
    });

    it('logs the count only, never ids or emails', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      await expire([demo.userId]);
      const logged: string[] = [];
      const log = vi.spyOn(Logger.prototype, 'log').mockImplementation((message: unknown) => {
        logged.push(String(message));
      });
      try {
        await call(`Bearer ${SECRET}`).expect(200);
      } finally {
        log.mockRestore();
      }
      // Other loggers (the request log) may write too: look at the cleanup line only.
      const cleanup = logged.filter((line) => line.startsWith('Demo cleanup'));
      expect(cleanup).toEqual(['Demo cleanup deleted 1 user(s), hasMore=false']);
      expect(logged.join('\n')).not.toContain(demo.userId);
    });
  });

  describe('batching', () => {
    const makeExpired = async (count: number): Promise<string[]> => {
      const past = Date.now() - HOUR_MS;
      await t.db.prisma.user.createMany({
        data: Array.from({ length: count }, (_, i) => ({
          name: 'D',
          email: `old-${i}@demo.shelfmark.invalid`,
          isDemo: true,
          demoExpiresAt: new Date(past + i),
        })),
      });
      return (await t.db.prisma.user.findMany({ select: { id: true } })).map((user) => user.id);
    };

    it('loops over batches until nothing is left', async () => {
      await makeExpired(5);
      const service = t.app.get(DemoCleanupService);
      const spy = vi.spyOn(t.db.prisma.user, 'deleteMany');
      try {
        expect(await service.run({ batchSize: 2 })).toEqual({ deleted: 5, hasMore: false });
        expect(spy).toHaveBeenCalledTimes(3);
      } finally {
        spy.mockRestore();
      }
      expect(await t.db.prisma.user.count()).toBe(0);
    });

    it('stops at the time budget and reports hasMore, then the next run continues', async () => {
      await makeExpired(5);
      const service = t.app.get(DemoCleanupService);
      expect(await service.run({ batchSize: 2, budgetMs: 0 })).toEqual({
        deleted: 2,
        hasMore: true,
      });
      expect(await t.db.prisma.user.count()).toBe(3);
      expect(await service.run({ batchSize: 2 })).toEqual({ deleted: 3, hasMore: false });
    });

    it('reports hasMore false when the budget ends exactly on the last batch', async () => {
      await makeExpired(2);
      const service = t.app.get(DemoCleanupService);
      expect(await service.run({ batchSize: 2, budgetMs: 0 })).toEqual({
        deleted: 2,
        hasMore: false,
      });
    });

    it('re-checks the predicate at delete time: a row that stopped being expired is kept', async () => {
      const [expiredId] = await makeExpired(1);
      const live = await t.db.prisma.user.create({
        data: {
          name: 'L',
          email: 'live@demo.shelfmark.invalid',
          isDemo: true,
          demoExpiresAt: new Date(Date.now() + HOUR_MS),
        },
      });
      const regular = await t.db.prisma.user.create({
        data: { name: 'R', email: 'reg@example.test' },
      });
      const find = vi
        .spyOn(t.db.prisma.user, 'findMany')
        // The read saw all three as expired demo users; the delete must not trust it.
        .mockResolvedValueOnce([{ id: expiredId }, { id: live.id }, { id: regular.id }] as never);
      try {
        const result = await t.app.get(DemoCleanupService).run({ batchSize: 10 });
        expect(result).toEqual({ deleted: 1, hasMore: false });
      } finally {
        find.mockRestore();
      }
      const left = await t.db.prisma.user.findMany({ select: { id: true } });
      expect(left.map((user) => user.id).sort()).toEqual([live.id, regular.id].sort());
    });

    it('stops instead of spinning when a read batch deletes nothing', async () => {
      const live = await t.db.prisma.user.create({
        data: {
          name: 'L',
          email: 'live2@demo.shelfmark.invalid',
          isDemo: true,
          demoExpiresAt: new Date(Date.now() + HOUR_MS),
        },
      });
      const find = vi
        .spyOn(t.db.prisma.user, 'findMany')
        .mockResolvedValue([{ id: live.id }, { id: live.id }] as never);
      try {
        const result = await t.app.get(DemoCleanupService).run({ batchSize: 2 });
        expect(result).toEqual({ deleted: 0, hasMore: false });
        expect(find).toHaveBeenCalledTimes(1);
      } finally {
        find.mockRestore();
      }
      expect(await t.db.prisma.user.count()).toBe(1);
    });

    it('also deletes a demo user without an expiry once it is older than the session limit', async () => {
      // The database check forbids this row; drop it for this test to prove the cleanup copes.
      await t.db.prisma.$executeRaw`ALTER TABLE users DROP CONSTRAINT users_demo_expiry_check`;
      const old = new Date(Date.now() - 25 * HOUR_MS);
      await t.db.prisma.user.createMany({
        data: [
          { name: 'Old', email: 'o@demo.shelfmark.invalid', isDemo: true, createdAt: old },
          { name: 'New', email: 'n@demo.shelfmark.invalid', isDemo: true },
          { name: 'Reg', email: 'reg-old@example.test', createdAt: old },
        ],
      });
      const result = await t.app.get(DemoCleanupService).run();
      expect(result).toEqual({ deleted: 1, hasMore: false });
      const left = (await t.db.prisma.user.findMany()).map((user) => user.name).sort();
      expect(left).toEqual(['New', 'Reg']);
    });

    it('uses a batch of 100 and a 5 second budget by default', () => {
      expect(DEMO_CLEANUP_LIMITS).toEqual({ BatchSize: 100, BudgetMs: 5000 });
    });
  });
});
