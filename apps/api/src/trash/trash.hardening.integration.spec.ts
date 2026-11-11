import { randomBytes } from 'node:crypto';
import { TRASH_ENDPOINT, TRASH_ITEM_KIND, type ListTrashResponse } from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { randomUuidV7 } from '../../test-utils/isolation/random-uuid-v7';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { CRON_ENV } from '../demo/models/cron-env.const';
import { TrashCleanupService } from './trash-cleanup.service';

const SECRET = randomBytes(24).toString('hex');
const DAY_MS = 24 * 60 * 60 * 1000;
const ago = (days: number): Date => new Date(Date.now() - days * DAY_MS);

describe('trash hardening (review findings)', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp({ env: { [CRON_ENV.Secret]: SECRET } });
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const folder = async (
    userId: string,
    name: string,
    deletedAt: Date | null,
    parentId: string | null = null,
  ): Promise<string> =>
    (await t.db.prisma.folder.create({ data: { userId, name, deletedAt, parentId } })).id;

  async function link(
    userId: string,
    deletedAt: Date | null,
    folderId: string | null = null,
  ): Promise<string> {
    const n = randomBytes(6).toString('hex');
    return (
      await t.db.prisma.link.create({
        data: {
          userId,
          folderId,
          url: `https://h.test/${n}`,
          normalizedUrl: `https://h.test/${n}`,
          title: n,
          titleSortKey: n,
          deletedAt,
        },
      })
    ).id;
  }

  const trash = async (agent: TestAgent): Promise<ListTrashResponse> =>
    (await agent.get(TRASH_ENDPOINT.Base).expect(200)).body as ListTrashResponse;

  const body = (...items: { kind: string; id: string }[]) => ({ items });
  const lnk = (id: string) => ({ kind: TRASH_ITEM_KIND.Link, id });
  const fld = (id: string) => ({ kind: TRASH_ITEM_KIND.Folder, id });

  describe('separately trashed subfolders survive their parent (finding 2)', () => {
    async function setup(userId: string) {
      const stamp = ago(2);
      const parent = await folder(userId, 'P', stamp);
      const shared = await folder(userId, 'Shared', stamp, parent);
      const ownStamp = ago(5);
      const own = await folder(userId, 'Own', ownStamp, parent);
      const ownLink = await link(userId, ownStamp, own);
      const sharedLink = await link(userId, stamp, shared);
      return { parent, shared, own, ownLink, sharedLink };
    }

    it('delete forever detaches it and keeps it as its own top-level entry', async () => {
      const s = await setup(users.owner.userId);
      const res = await a
        .post(TRASH_ENDPOINT.Delete)
        .send(body(fld(s.parent)))
        .expect(200);
      expect(res.body).toEqual({ count: 1 });
      const left = await t.db.prisma.folder.findMany();
      expect(left.map((row) => row.id)).toEqual([s.own]);
      expect(left[0]?.parentId).toBeNull();
      expect(await t.db.prisma.link.findMany({ select: { id: true } })).toEqual([
        { id: s.ownLink },
      ]);
      const list = await trash(a);
      expect(list.items.map((item) => item.id)).toEqual([s.own]);
      expect(list.items[0]).toMatchObject({ linkCount: 1, fromFolderName: null });
    });

    it('the purge does the same', async () => {
      // Child trashed later than its parent (only possible by data surgery or a restore sequence):
      // the parent is expired, the child is not.
      const userId = users.owner.userId;
      const parent = await folder(userId, 'P', ago(40));
      const child = await folder(userId, 'C', ago(1), parent);
      const kept = await link(userId, ago(1), child);
      const res = await t.app.get(TrashCleanupService).run();
      expect(res).toEqual({ deleted: 1, hasMore: false });
      const row = await t.db.prisma.folder.findUniqueOrThrow({ where: { id: child } });
      expect(row.parentId).toBeNull();
      expect(await t.db.prisma.link.count({ where: { id: kept } })).toBe(1);
      expect(await t.db.prisma.folder.count({ where: { id: parent } })).toBe(0);
    });
  });

  describe('purge concurrency (finding 1)', () => {
    // Row locks (SKIP LOCKED against an uncommitted restore) cannot be shown here: PGlite serves all
    // connections from one session, so a lock never blocks another connection. The statements and
    // their re-check of deleted_at and the cutoff are reviewed, and run on real Postgres in CI's db-check.

    it('two purges in parallel do not error and delete every row once', async () => {
      const userId = users.owner.userId;
      for (let i = 0; i < 30; i++) await link(userId, ago(100));
      for (let i = 0; i < 10; i++) await folder(userId, `f${i}`, ago(100));
      const cleanup = t.app.get(TrashCleanupService);
      const [x, y] = await Promise.all([
        cleanup.run({ batchSize: 4 }),
        cleanup.run({ batchSize: 4 }),
      ]);
      expect(x.deleted + y.deleted).toBe(40);
      expect(await t.db.prisma.link.count()).toBe(0);
      expect(await t.db.prisma.folder.count()).toBe(0);
    }, 30_000);
  });

  describe('rate limit on irreversible writes (finding 3)', () => {
    it('limits POST /api/trash/delete and DELETE /api/trash', async () => {
      const send = () => a.post(TRASH_ENDPOINT.Delete).send(body(lnk(randomUuidV7())));
      for (let i = 0; i < 10; i++) await send().expect(200);
      await send().expect(429);
      resetRateLimits(t.app);
      for (let i = 0; i < 10; i++) await a.delete(TRASH_ENDPOINT.Base).expect(200);
      await a.delete(TRASH_ENDPOINT.Base).expect(429);
    });

    it('handles a full 100-entry batch of folders and links', async () => {
      const userId = users.owner.userId;
      const items = [];
      for (let i = 0; i < 50; i++) items.push(lnk(await link(userId, ago(1))));
      for (let i = 0; i < 50; i++) items.push(fld(await folder(userId, `f${i}`, ago(1))));
      expect(
        (
          await a
            .post(TRASH_ENDPOINT.Restore)
            .send(body(...items))
            .expect(200)
        ).body,
      ).toEqual({
        count: 100,
      });
      await a.delete(TRASH_ENDPOINT.Base).expect(200);
    }, 30_000);
  });

  describe('children inside a trashed folder (finding 4)', () => {
    async function trashedTree(userId: string) {
      const stamp = ago(1);
      const parent = await folder(userId, 'P', stamp);
      const child = await folder(userId, 'C', stamp, parent);
      const inParent = await link(userId, stamp, parent);
      const inChild = await link(userId, stamp, child);
      return { parent, child, inParent, inChild };
    }

    it('restoring a child link goes to Unsorted and leaves the folder in Trash', async () => {
      const s = await trashedTree(users.owner.userId);
      expect(
        (
          await a
            .post(TRASH_ENDPOINT.Restore)
            .send(body(lnk(s.inChild)))
            .expect(200)
        ).body,
      ).toEqual({ count: 1 });
      const row = await t.db.prisma.link.findUniqueOrThrow({ where: { id: s.inChild } });
      expect(row).toMatchObject({ deletedAt: null, folderId: null });
      expect((await trash(a)).items.map((item) => item.id)).toEqual([s.parent]);
    });

    it('restoring a child folder puts it at the top level with its links', async () => {
      const s = await trashedTree(users.owner.userId);
      expect(
        (
          await a
            .post(TRASH_ENDPOINT.Restore)
            .send(body(fld(s.child)))
            .expect(200)
        ).body,
      ).toEqual({ count: 1 });
      const row = await t.db.prisma.folder.findUniqueOrThrow({ where: { id: s.child } });
      expect(row).toMatchObject({ deletedAt: null, parentId: null });
      expect(
        (await t.db.prisma.link.findUniqueOrThrow({ where: { id: s.inChild } })).deletedAt,
      ).toBeNull();
      expect(
        (await t.db.prisma.link.findUniqueOrThrow({ where: { id: s.inParent } })).deletedAt,
      ).not.toBeNull();
    });

    it('deleting a child link or child folder for good is allowed', async () => {
      const s = await trashedTree(users.owner.userId);
      expect(
        (
          await a
            .post(TRASH_ENDPOINT.Delete)
            .send(body(lnk(s.inParent)))
            .expect(200)
        ).body,
      ).toEqual({ count: 1 });
      expect(
        (
          await a
            .post(TRASH_ENDPOINT.Delete)
            .send(body(fld(s.child)))
            .expect(200)
        ).body,
      ).toEqual({ count: 1 });
      expect(await t.db.prisma.link.count({ where: { id: s.inChild } })).toBe(0);
      expect(await t.db.prisma.folder.count({ where: { id: s.parent } })).toBe(1);
    });

    it('another user cannot restore or delete those child ids', async () => {
      const s = await trashedTree(users.owner.userId);
      const all = body(lnk(s.inParent), lnk(s.inChild), fld(s.child), fld(s.parent));
      expect((await b.post(TRASH_ENDPOINT.Restore).send(all).expect(200)).body).toEqual({
        count: 0,
      });
      expect((await b.post(TRASH_ENDPOINT.Delete).send(all).expect(200)).body).toEqual({
        count: 0,
      });
      expect(await t.db.prisma.folder.count({ where: { deletedAt: { not: null } } })).toBe(2);
      expect(await t.db.prisma.link.count({ where: { deletedAt: { not: null } } })).toBe(2);
    });
  });

  describe('isolation corner cases (finding 5)', () => {
    it('equal deleted_at for two users keeps subtree restore and delete per user', async () => {
      const stamp = ago(1);
      const make = async (userId: string) => {
        const root = await folder(userId, 'R', stamp);
        const sub = await folder(userId, 'S', stamp, root);
        return { root, sub, l: await link(userId, stamp, sub) };
      };
      const mine = await make(users.owner.userId);
      const theirs = await make(users.intruder.userId);

      await a
        .post(TRASH_ENDPOINT.Restore)
        .send(body(fld(mine.root)))
        .expect(200);
      expect(
        (await t.db.prisma.link.findUniqueOrThrow({ where: { id: mine.l } })).deletedAt,
      ).toBeNull();
      expect(
        (await t.db.prisma.link.findUniqueOrThrow({ where: { id: theirs.l } })).deletedAt,
      ).not.toBeNull();
      expect(
        (await t.db.prisma.folder.findUniqueOrThrow({ where: { id: theirs.sub } })).deletedAt,
      ).not.toBeNull();

      await b
        .post(TRASH_ENDPOINT.Delete)
        .send(body(fld(theirs.root)))
        .expect(200);
      expect(await t.db.prisma.folder.count({ where: { id: { in: [mine.root, mine.sub] } } })).toBe(
        2,
      );
      expect(await t.db.prisma.link.count({ where: { id: mine.l } })).toBe(1);
      expect(await t.db.prisma.link.count({ where: { id: theirs.l } })).toBe(0);
    });

    it('a foreign id in a mixed batch is skipped while the own entries are handled', async () => {
      const mine = await link(users.owner.userId, ago(1));
      const theirs = await link(users.intruder.userId, ago(1));
      expect(
        (
          await a
            .post(TRASH_ENDPOINT.Restore)
            .send(body(lnk(theirs), lnk(mine)))
            .expect(200)
        ).body,
      ).toEqual({ count: 1 });
      expect(
        (await t.db.prisma.link.findUniqueOrThrow({ where: { id: mine } })).deletedAt,
      ).toBeNull();
      expect(
        (await t.db.prisma.link.findUniqueOrThrow({ where: { id: theirs } })).deletedAt,
      ).not.toBeNull();
      const other = await link(users.owner.userId, ago(1));
      expect(
        (
          await a
            .post(TRASH_ENDPOINT.Delete)
            .send(body(lnk(theirs), lnk(other)))
            .expect(200)
        ).body,
      ).toEqual({ count: 1 });
      expect(await t.db.prisma.link.count({ where: { id: theirs } })).toBe(1);
    });

    it('a link pointing at a foreign folder never shows its name and restores to Unsorted', async () => {
      const foreign = await folder(users.intruder.userId, 'ForeignSecretName', null);
      const id = await link(users.owner.userId, ago(1), foreign);
      const list = await trash(a);
      expect(list.items).toHaveLength(1);
      expect(list.items[0]).toMatchObject({ id, fromFolderName: null });
      expect(JSON.stringify(list)).not.toContain('ForeignSecretName');

      await a
        .post(TRASH_ENDPOINT.Restore)
        .send(body(lnk(id)))
        .expect(200);
      const row = await t.db.prisma.link.findUniqueOrThrow({ where: { id } });
      expect(row.folderId).toBeNull();
      expect(await t.db.prisma.folder.count({ where: { id: foreign } })).toBe(1);
    });

    it('the purge of a link pointing at a foreign folder leaves that folder alone', async () => {
      const foreign = await folder(users.intruder.userId, 'Theirs', null);
      const id = await link(users.owner.userId, ago(100), foreign);
      expect(await t.app.get(TrashCleanupService).run()).toEqual({ deleted: 1, hasMore: false });
      expect(await t.db.prisma.link.count({ where: { id } })).toBe(0);
      expect(await t.db.prisma.folder.count({ where: { id: foreign } })).toBe(1);
    });

    it('serves the favicon of a trashed link to the owner only', async () => {
      const id = await link(users.owner.userId, ago(1));
      await t.db.prisma.linkImage.create({
        data: {
          userId: users.owner.userId,
          linkId: id,
          kind: 'favicon',
          contentType: 'image/webp',
          bytes: Buffer.from('x'),
          width: 1,
          height: 1,
          sha256: 'b'.repeat(64),
        },
      });
      await a.get(`/api/links/${id}/favicon`).expect(200);
      await b.get(`/api/links/${id}/favicon`).expect(404);
    });
  });
});
