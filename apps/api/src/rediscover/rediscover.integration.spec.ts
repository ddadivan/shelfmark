import { AI_ENDPOINT, REDISCOVER_ENDPOINT, type RediscoverResponse } from '@shelfmark/contracts';
import { AwaitableDeferrer } from '../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { AiBackgroundService } from '../ai/background/ai-background.service';
import { AI_ENV } from '../ai/models/ai-env.const';
import { isoWeek } from './iso-week';
import { RediscoverService } from './rediscover.service';

const DAY = 86_400_000;
const hide = (id: string) => REDISCOVER_ENDPOINT.Hide.replace(':id', id);

describe('Rediscover (F8)', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  const deferrer = new AwaitableDeferrer();

  beforeAll(async () => {
    t = await createAuthTestApp({
      env: { [AI_ENV.FullAccessEmails]: undefined },
      overrides: [{ provide: AiBackgroundService, useValue: deferrer }],
    });
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
  });

  afterEach(async () => {
    deferrer.clear();
    vi.restoreAllMocks();
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const owner = (): string => users.owner.userId;
  const intruder = (): string => users.intruder.userId;
  const daysAgo = (days: number) => new Date(Date.now() - days * DAY);
  const block = async (agent: TestAgent = a) =>
    (await agent.get(REDISCOVER_ENDPOINT.Block).expect(200)).body as RediscoverResponse;
  const titles = (res: RediscoverResponse) => res.items.map((item) => item.title);
  const old = (userId: string, title: string, extra: Parameters<typeof seedLink>[2] = {}) =>
    seedLink(t.db.prisma, userId, { title, createdAt: daysAgo(60), ...extra });

  it('needs a session', async () => {
    await anonymous(t.app).get(REDISCOVER_ENDPOINT.Block).expect(401);
    await anonymous(t.app).post(REDISCOVER_ENDPOINT.Dismiss).expect(401);
  });

  it('picks old links not opened for 90 days, with no future reminder and not hidden', async () => {
    const kept = [
      await old(owner(), 'Never opened'),
      await old(owner(), 'Opened long ago', { lastOpenedAt: daysAgo(120) }),
      await old(owner(), 'Old with a due reminder'),
    ];
    await t.db.prisma.link.update({
      where: { id: kept[2] },
      data: { remindAt: daysAgo(1) },
    });
    await old(owner(), 'Opened lately', { lastOpenedAt: daysAgo(10) });
    await seedLink(t.db.prisma, owner(), { title: 'Too new', createdAt: daysAgo(20) });
    const reminded = await old(owner(), 'Reminder ahead');
    await t.db.prisma.link.update({
      where: { id: reminded },
      data: { remindAt: new Date(Date.now() + DAY) },
    });
    const trashed = await old(owner(), 'Trashed');
    await t.db.prisma.link.update({ where: { id: trashed }, data: { deletedAt: new Date() } });

    const res = await block();
    expect(res).toMatchObject({ week: isoWeek(new Date()), mode: 'forgotten', theme: null });
    expect(titles(res).sort()).toEqual([
      'Never opened',
      'Old with a due reminder',
      'Opened long ago',
    ]);

    await a.post(hide(kept[0] ?? '')).expect(204);
    await a.post(hide(kept[0] ?? '')).expect(204);
    expect((await block()).items).toEqual([]);
  });

  it('shows at most five in an order stable within a week and different across weeks', async () => {
    for (let i = 0; i < 12; i += 1) await old(owner(), `Old ${i}`);
    const service = t.app.get(RediscoverService);
    const user = { id: owner(), isDemo: false } as never;
    const monday = new Date('2026-11-16T08:00:00.000Z');
    const sunday = new Date('2026-11-22T20:00:00.000Z');
    const first = titles(await service.block(user, monday));
    expect(first).toHaveLength(5);
    expect(titles(await service.block(user, sunday))).toEqual(first);
    const weeks = await Promise.all(
      [1, 2, 3, 4].map(async (weeks) =>
        titles(await service.block(user, new Date(monday.getTime() + weeks * 7 * DAY))),
      ),
    );
    expect(weeks.some((next) => next.join() !== first.join())).toBe(true);
  });

  it('dismisses the block for this week only, per user', async () => {
    for (let i = 0; i < 3; i += 1) {
      await old(owner(), `Mine ${i}`);
      await old(intruder(), `Theirs ${i}`);
    }
    await a.post(REDISCOVER_ENDPOINT.Dismiss).expect(204);
    await a.post(REDISCOVER_ENDPOINT.Dismiss).expect(204);
    expect(await block()).toEqual({
      week: isoWeek(new Date()),
      mode: null,
      theme: null,
      items: [],
    });
    expect((await block(b)).items).toHaveLength(3);
    const nextWeek = await t.app
      .get(RediscoverService)
      .block({ id: owner(), isDemo: false } as never, new Date(Date.now() + 7 * DAY));
    expect(nextWeek.items).toHaveLength(3);
  });

  it('answers 404 for hiding a missing, trashed or foreign link, and 400 for a bad id', async () => {
    const theirs = await old(intruder(), 'Theirs');
    await a.post(hide(theirs)).expect(404);
    const trashed = await old(owner(), 'Trashed');
    await t.db.prisma.link.update({ where: { id: trashed }, data: { deletedAt: new Date() } });
    await a.post(hide(trashed)).expect(404);
    await a.post(hide('not-a-uuid')).expect(400);
    expect(await t.db.prisma.rediscoverHidden.count()).toBe(0);
  });

  it('is data-isolated: never lists or hides another user’s links', async () => {
    await expectIsolated(t.app, users, {
      create: async () => {
        const id = await old(owner(), 'Isolated one');
        await old(owner(), 'Isolated two');
        await old(owner(), 'Isolated three');
        return id;
      },
      read: (agent, id) => agent.get(`/api/links/${id}`),
      update: (agent, id) => agent.post(hide(id)),
      list: {
        request: (agent) => agent.get(REDISCOVER_ENDPOINT.Block),
        ids: (body) => (body as RediscoverResponse).items.map((item) => item.id),
      },
      skip: {
        remove: 'Rediscover has no delete; hiding is the update',
        reference: 'no other resource refers to a Rediscover entry',
      },
    });
  });

  describe('theme mode', () => {
    const turnOn = async (agent: TestAgent) => {
      await agent
        .patch(AI_ENDPOINT.Settings)
        .send({ enabled: true, summaries: false, folderMode: 'off', tagsMode: 'off' })
        .expect(200);
      await deferrer.flush();
    };
    const themeLibrary = async (userId: string) => {
      const folder = await t.db.prisma.folder.create({ data: { userId, name: 'Kitchen' } });
      for (const title of ['Ramen broth basics', 'Ramen noodle recipe', 'Quick ramen recipe']) {
        await seedLink(t.db.prisma, userId, {
          title,
          tags: ['cooking'],
          folderId: folder.id,
          createdAt: daysAgo(3),
        });
      }
      for (const title of ['Ramen shops list', 'Ramen toppings guide', 'Ramen eggs recipe']) {
        await old(userId, title);
      }
      await old(userId, 'Tax return forms');
      await old(userId, 'Bicycle repair manual');
    };

    it('picks old links near what the user saved lately, labelled with the top tag', async () => {
      await t.db.prisma.user.update({ where: { id: owner() }, data: { aiPack: true } });
      await themeLibrary(owner());
      await turnOn(a);
      const res = await block();
      expect(res.mode).toBe('theme');
      expect(res.theme).toBe('cooking');
      expect(titles(res).slice(0, 3).sort()).toEqual([
        'Ramen eggs recipe',
        'Ramen shops list',
        'Ramen toppings guide',
      ]);
    });

    it('falls back to the folder name, and to forgotten mode for Free, AI off or too few', async () => {
      await themeLibrary(owner());
      expect((await block()).mode).toBe('forgotten');
      await turnOn(a);
      expect((await block()).mode).toBe('forgotten');
      await t.db.prisma.user.update({ where: { id: owner() }, data: { aiPack: true } });
      await t.db.prisma.linkTag.deleteMany({});
      const byFolder = await block();
      expect(byFolder).toMatchObject({ mode: 'theme', theme: 'Kitchen' });
      await t.db.prisma.link.updateMany({
        where: { userId: owner(), createdAt: { gt: daysAgo(14) } },
        data: { folderId: null },
      });
      expect((await block()).mode).toBe('forgotten');
      await t.db.prisma.link.updateMany({
        where: { userId: owner(), createdAt: { gt: daysAgo(14) } },
        data: { deletedAt: new Date() },
      });
      expect((await block()).mode).toBe('forgotten');
    });

    it("never uses another user's vectors or links", async () => {
      await t.db.prisma.user.update({ where: { id: owner() }, data: { aiPack: true } });
      await themeLibrary(intruder());
      await turnOn(b);
      for (let i = 0; i < 3; i += 1) await old(owner(), `Mine ${i}`);
      await turnOn(a);
      const res = await block();
      expect(res.mode).toBe('forgotten');
      expect(titles(res).every((title) => title.startsWith('Mine'))).toBe(true);
    });
  });
});
