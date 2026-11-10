import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { CRON_ENV } from '../demo/models/cron-env.const';
import { CRON_ROUTE } from '../demo/models/cron-route.const';
import { TrashCleanupService } from './trash-cleanup.service';
import type { TrashCleanupResponse } from './models/trash-cleanup-response.interface';

// Random per run, like every other test secret: nothing to leak.
const SECRET = randomBytes(24).toString('hex');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('GET /api/cron/trash-cleanup', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;

  beforeAll(async () => {
    t = await createAuthTestApp({ env: { [CRON_ENV.Secret]: SECRET } });
  });

  beforeEach(async () => {
    users = await createIsolationUsers(t);
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
    const req = request(t.app.getHttpServer()).get(CRON_ROUTE.TrashCleanupPath);
    return authorization === undefined ? req : req.set('Authorization', authorization);
  };

  const ago = (days: number): Date => new Date(Date.now() - days * DAY_MS);

  async function addLink(
    userId: string,
    deletedAt: Date | null,
    folderId: string | null = null,
  ): Promise<string> {
    const n = Math.random().toString(36).slice(2);
    const row = await t.db.prisma.link.create({
      data: {
        userId,
        folderId,
        url: `https://x.test/${n}`,
        normalizedUrl: `https://x.test/${n}`,
        title: n,
        titleSortKey: n,
        deletedAt,
      },
    });
    return row.id;
  }

  const addFolder = async (
    userId: string,
    deletedAt: Date | null,
    parentId: string | null = null,
  ): Promise<string> =>
    (await t.db.prisma.folder.create({ data: { userId, name: 'f', deletedAt, parentId } })).id;

  describe('authentication', () => {
    it.each([
      ['no header', undefined],
      ['a wrong secret', 'Bearer not-the-secret'],
      ['another scheme', `Basic ${SECRET}`],
      ['an empty bearer', 'Bearer '],
    ])('answers 401 with %s and deletes nothing', async (_label, header) => {
      await t.db.prisma.user.update({
        where: { id: users.owner.userId },
        data: { trashRetentionDays: 7 },
      });
      const id = await addLink(users.owner.userId, ago(100));
      const res = await call(header).expect(401);
      expect(res.body).toMatchObject({ statusCode: 401 });
      expect(await t.db.prisma.link.count({ where: { id } })).toBe(1);
    });

    it('fails closed while the secret is unset or too short', async () => {
      const id = await addLink(users.owner.userId, ago(100));
      delete process.env[CRON_ENV.Secret];
      await call(`Bearer ${SECRET}`).expect(401);
      process.env[CRON_ENV.Secret] = 'short';
      await call('Bearer short').expect(401);
      expect(await t.db.prisma.link.count({ where: { id } })).toBe(1);
    });

    it('is not reachable with a user session', async () => {
      await request(t.app.getHttpServer())
        .get(CRON_ROUTE.TrashCleanupPath)
        .set('Cookie', users.owner.cookie)
        .expect(401);
    });
  });

  describe('purge', () => {
    it('answers { deleted, hasMore } with no-store', async () => {
      const res = await call(`Bearer ${SECRET}`).expect(200);
      expect(res.body).toEqual({ deleted: 0, hasMore: false });
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('deletes by the retention of each owner and keeps live and young rows', async () => {
      const [a, b] = [users.owner.userId, users.intruder.userId];
      await t.db.prisma.user.update({ where: { id: a }, data: { trashRetentionDays: 7 } });
      await t.db.prisma.user.update({ where: { id: b }, data: { trashRetentionDays: 90 } });
      const aOld = await addLink(a, ago(8));
      const aYoung = await addLink(a, ago(6));
      const aLive = await addLink(a, null);
      const bOld = await addLink(b, ago(91));
      const bMid = await addLink(b, ago(40));
      const aFolder = await addFolder(a, ago(10));
      const bFolder = await addFolder(b, ago(10));

      const res = await call(`Bearer ${SECRET}`).expect(200);
      expect(res.body).toEqual({ deleted: 3, hasMore: false });
      const ids = (await t.db.prisma.link.findMany({ select: { id: true } })).map((r) => r.id);
      expect(ids.sort()).toEqual([aYoung, aLive, bMid].sort());
      expect(ids).not.toContain(aOld);
      expect(ids).not.toContain(bOld);
      const folders = (await t.db.prisma.folder.findMany({ select: { id: true } })).map(
        (r) => r.id,
      );
      expect(folders).toEqual([bFolder]);
      expect(folders).not.toContain(aFolder);
    });

    it('uses the retention at the time of the run (changing it applies to old rows)', async () => {
      const a = users.owner.userId;
      const id = await addLink(a, ago(20));
      expect(await t.db.prisma.link.count({ where: { id } })).toBe(1);
      await call(`Bearer ${SECRET}`).expect(200);
      expect(await t.db.prisma.link.count({ where: { id } })).toBe(1); // 30 days: still kept
      await t.db.prisma.user.update({ where: { id: a }, data: { trashRetentionDays: 7 } });
      expect((await call(`Bearer ${SECRET}`).expect(200)).body).toEqual({
        deleted: 1,
        hasMore: false,
      });
    });

    it('removes a folder with the links deleted with it, and frees a link deleted earlier', async () => {
      const a = users.owner.userId;
      const stamp = ago(40);
      const root = await addFolder(a, stamp);
      const child = await addFolder(a, stamp, root);
      const together = await addLink(a, stamp, child);
      // Deleted on its own earlier inside the folder: expires first and goes on its own.
      const early = await addLink(a, ago(50), root);
      const res = await call(`Bearer ${SECRET}`).expect(200);
      // Two links and two folders (both folders expired in the same batch).
      expect(res.body).toEqual({ deleted: 4, hasMore: false });
      expect(await t.db.prisma.link.count({ where: { id: { in: [together, early] } } })).toBe(0);
      expect(await t.db.prisma.folder.count()).toBe(0);
    });

    it('is idempotent', async () => {
      await addLink(users.owner.userId, ago(100));
      expect((await call(`Bearer ${SECRET}`).expect(200)).body).toEqual({
        deleted: 1,
        hasMore: false,
      });
      expect((await call(`Bearer ${SECRET}`).expect(200)).body).toEqual({
        deleted: 0,
        hasMore: false,
      });
    });

    it('works in batches and reports hasMore when the budget runs out', async () => {
      const a = users.owner.userId;
      for (let i = 0; i < 5; i++) await addLink(a, ago(100));
      const cleanup = t.app.get(TrashCleanupService);
      // A zero budget stops after the first full batch.
      const first: TrashCleanupResponse = await cleanup.run({ batchSize: 2, budgetMs: 0 });
      expect(first).toEqual({ deleted: 2, hasMore: true });
      const second = await cleanup.run({ batchSize: 2, budgetMs: 0 });
      expect(second).toEqual({ deleted: 2, hasMore: true });
      const last = await cleanup.run({ batchSize: 2, budgetMs: 0 });
      expect(last).toEqual({ deleted: 1, hasMore: false });
      expect(await t.db.prisma.link.count()).toBe(0);
    });

    it('drains every batch within the budget', async () => {
      const a = users.owner.userId;
      for (let i = 0; i < 5; i++) await addLink(a, ago(100));
      await addFolder(a, ago(100));
      const result = await t.app.get(TrashCleanupService).run({ batchSize: 2 });
      expect(result).toEqual({ deleted: 6, hasMore: false });
    });
  });
});
