import {
  READER_LIMIT,
  type ReaderProgress,
  type ReaderProgressResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';

const LIST = '/api/reader/progress';
const one = (id: string): string => `${LIST}/${id}`;

describe('/api/reader/progress', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const link = (url?: string): Promise<string> =>
    seedLink(t.db.prisma, users.owner.userId, url === undefined ? {} : { url });
  const save = async (id: string, fraction: number, minutesLeft = 3): Promise<void> => {
    await a.put(one(id)).send({ fraction, minutesLeft }).expect(204);
  };
  const list = async (): Promise<ReaderProgress[]> =>
    (await a.get(LIST).expect(200)).body as ReaderProgress[];

  it('is isolated per user', async () => {
    await expectIsolated(t.app, users, {
      create: async (owner) => {
        const id = await link();
        await owner.put(one(id)).send({ fraction: 0.3, minutesLeft: 4 }).expect(204);
        return id;
      },
      read: (agent, id) => agent.get(one(id)),
      update: (agent, id) => agent.put(one(id)).send({ fraction: 0.9, minutesLeft: 1 }),
      list: {
        request: (agent) => agent.get(LIST),
        ids: (body) => (body as ReaderProgress[]).map((item) => item.linkId),
      },
      skip: {
        remove: 'no delete route: cleared on a URL change and with the link',
        reference: 'nothing takes a link id from this resource',
      },
    });
  });

  it('stores and answers the progress of one link, the server stamping the time', async () => {
    const id = await link();
    const before = Date.now();
    await save(id, 0.42, 4);
    const body = (await a.get(one(id)).expect(200)).body as ReaderProgressResponse;
    expect(body.progress).toMatchObject({ linkId: id, fraction: 0.42, minutesLeft: 4 });
    expect(Date.parse(body.progress?.updatedAt ?? '')).toBeGreaterThanOrEqual(before - 1_000);
    await save(id, 0.6, 2);
    expect(
      ((await a.get(one(id)).expect(200)).body as ReaderProgressResponse).progress,
    ).toMatchObject({
      fraction: 0.6,
      minutesLeft: 2,
    });
  });

  it('answers null for an own link without progress', async () => {
    const id = await link();
    expect((await a.get(one(id)).expect(200)).body).toEqual({ progress: null });
  });

  it("never touches the link's updated_at", async () => {
    const id = await link();
    const { updatedAt } = await t.db.prisma.link.findUniqueOrThrow({ where: { id } });
    await save(id, 0.5);
    const after = await t.db.prisma.link.findUniqueOrThrow({ where: { id } });
    expect(after.updatedAt).toEqual(updatedAt);
  });

  it('lists started, unfinished texts of live links, newest first, at most five', async () => {
    const ids: string[] = [];
    for (let index = 0; index < 7; index++) ids.push(await link());
    const [notStarted, done, trashed, ...rest] = ids as [string, string, string, ...string[]];
    await save(notStarted, READER_LIMIT.StartedFraction - 0.01);
    await save(done, READER_LIMIT.DoneFraction);
    await save(trashed, 0.5);
    await t.db.prisma.link.update({ where: { id: trashed }, data: { deletedAt: new Date() } });
    for (const [index, id] of rest.entries()) {
      await save(id, 0.1 + index / 10);
      await t.db.prisma.readingProgress.update({
        where: { linkId: id },
        data: { updatedAt: new Date(Date.now() - (10 - index) * 60_000) },
      });
    }
    expect((await list()).map((item) => item.linkId)).toEqual([...rest].reverse());

    const sixth = await link();
    await save(sixth, 0.2);
    const items = await list();
    expect(items).toHaveLength(READER_LIMIT.ContinueMax);
    expect(items[0]?.linkId).toBe(sixth);
  });

  it('clears the progress when PATCH gives the link a new page, not on a title edit', async () => {
    const id = await link('https://read.test/a');
    await save(id, 0.5);
    await a.patch(`/api/links/${id}`).send({ title: 'Renamed' }).expect(200);
    expect(await list()).toHaveLength(1);
    await a.patch(`/api/links/${id}`).send({ url: 'https://read.test/b' }).expect(200);
    expect(await list()).toEqual([]);
    expect((await a.get(one(id)).expect(200)).body).toEqual({ progress: null });
  });

  it('is a 404 for a trashed link and writes nothing', async () => {
    const id = await link();
    await t.db.prisma.link.update({ where: { id }, data: { deletedAt: new Date() } });
    await a.put(one(id)).send({ fraction: 0.5, minutesLeft: 1 }).expect(404);
    await a.get(one(id)).expect(404);
    expect(await t.db.prisma.readingProgress.count()).toBe(0);
  });

  it.each([
    ['a fraction above 1', { fraction: 1.2, minutesLeft: 1 }],
    ['a negative fraction', { fraction: -0.1, minutesLeft: 1 }],
    ['a string fraction', { fraction: '0.5', minutesLeft: 1 }],
    ['fractional minutes', { fraction: 0.5, minutesLeft: 1.5 }],
    ['too many minutes', { fraction: 0.5, minutesLeft: READER_LIMIT.MinutesLeftMax + 1 }],
    ['a missing field', { fraction: 0.5 }],
    ['an unknown field', { fraction: 0.5, minutesLeft: 1, updatedAt: '2020-01-01' }],
  ])('refuses %s with a 400', async (_name, body) => {
    const id = await link();
    await a.put(one(id)).send(body).expect(400);
  });

  it('refuses a malformed id with a 400', async () => {
    await a.put(one('nope')).send({ fraction: 0.5, minutesLeft: 1 }).expect(400);
    await a.get(one('nope')).expect(400);
  });
});
