import { DEMO_LIMIT, FOLDER_LIMIT, LINK_LIMIT, TRASH_ENDPOINT } from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { signInDemo } from '../../test-utils/sign-in-demo';

describe('trash and the per-user limits (ADR 0036 point 5)', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const linkRows = (userId: string, count: number, deletedAt: Date | null) =>
    Array.from({ length: count }, (_, i) => ({
      userId,
      url: `https://cap.test/${i}`,
      normalizedUrl: `https://cap.test/${i}`,
      title: `t${i}`,
      titleSortKey: `t${i}`,
      deletedAt,
    }));

  it('counts trashed links toward the link cap, and Empty trash frees the room', async () => {
    const a = asUser(t.app, users.owner);
    const userId = users.owner.userId;
    await t.db.prisma.link.createMany({
      data: linkRows(userId, LINK_LIMIT.PerUserMax, new Date()),
    });
    await a.post('/api/links').send({ url: 'https://site.test/', title: 't' }).expect(409);
    await a.delete(TRASH_ENDPOINT.Base).expect(200);
    await a.post('/api/links').send({ url: 'https://site.test/', title: 't' }).expect(201);
  }, 60_000);

  it('counts trashed folders toward the folder cap', async () => {
    const a = asUser(t.app, users.owner);
    await t.db.prisma.folder.createMany({
      data: Array.from({ length: FOLDER_LIMIT.PerUserMax }, (_, i) => ({
        userId: users.owner.userId,
        name: `f${i}`,
        deletedAt: new Date(),
      })),
    });
    await a.post('/api/folders').send({ name: 'one too many' }).expect(409);
    await a.delete(TRASH_ENDPOINT.Base).expect(200);
    await a.post('/api/folders').send({ name: 'now fine' }).expect(201);
  });

  it('counts trashed links toward the demo cap of 100', async () => {
    const demo = await signInDemo(t.app, t.baseUrl);
    const a = asUser(t.app, demo);
    const existing = await t.db.prisma.link.count({ where: { userId: demo.userId } });
    await t.db.prisma.link.createMany({
      data: linkRows(demo.userId, DEMO_LIMIT.MaxLinks - existing, new Date()),
    });
    await a.post('/api/links').send({ url: 'https://site.test/', title: 't' }).expect(409);
  });

  it('does not let restoring exceed the cap: the total never changes', async () => {
    const a = asUser(t.app, users.owner);
    const userId = users.owner.userId;
    await t.db.prisma.link.createMany({
      data: linkRows(userId, LINK_LIMIT.PerUserMax, new Date()),
    });
    const before = await t.db.prisma.link.count({ where: { userId } });
    const some = await t.db.prisma.link.findMany({
      where: { userId },
      take: 5,
      select: { id: true },
    });
    await a
      .post(TRASH_ENDPOINT.Restore)
      .send({ items: some.map((row) => ({ kind: 'link', id: row.id })) })
      .expect(200);
    expect(await t.db.prisma.link.count({ where: { userId } })).toBe(before);
  }, 60_000);
});
