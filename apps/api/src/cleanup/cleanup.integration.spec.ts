import { CLEANUP_ENDPOINT, type CleanupReport } from '@shelfmark/contracts';
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

const DAY = 86_400_000;

describe('Clean-up report and rule checks (AI-5)', () => {
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
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const owner = (): string => users.owner.userId;
  const intruder = (): string => users.intruder.userId;
  const daysAgo = (days: number) => new Date(Date.now() - days * DAY);
  const report = async (agent: TestAgent = a) =>
    (await agent.get(CLEANUP_ENDPOINT.Report).expect(200)).body as CleanupReport;
  const run = async (agent: TestAgent = a, includeAi = false) =>
    (await agent.post(CLEANUP_ENDPOINT.Run).send({ includeAi }).expect(200)).body as CleanupReport;
  const coat = (userId: string, extra: Parameters<typeof seedLink>[2] = {}) =>
    seedLink(t.db.prisma, userId, {
      url: 'https://shop.example.test/coat?utm_source=mail',
      title: 'Wool coat',
      ...extra,
    });

  it('needs a session', async () => {
    await anonymous(t.app).get(CLEANUP_ENDPOINT.Report).expect(401);
    await anonymous(t.app).post(CLEANUP_ENDPOINT.Run).send({ includeAi: false }).expect(401);
  });

  it('answers state none before the first run', async () => {
    expect(await report()).toEqual({
      state: 'none',
      checked: 0,
      total: 0,
      checkedAt: null,
      aiIncluded: false,
      aiAvailable: false,
      duplicates: [],
      similarTags: [],
    });
  });

  it('groups exact duplicates by normalised address and keeps by the rule', async () => {
    const folder = await t.db.prisma.folder.create({ data: { userId: owner(), name: 'Clothes' } });
    const first = await coat(owner(), { createdAt: daysAgo(30) });
    const filed = await coat(owner(), { folderId: folder.id, createdAt: daysAgo(10) });
    const third = await seedLink(t.db.prisma, owner(), {
      url: 'https://SHOP.example.test/coat',
      title: 'Wool coat again',
      createdAt: daysAgo(2),
    });
    await seedLink(t.db.prisma, owner(), { url: 'https://shop.example.test/scarf' });

    const res = await run();
    expect(res).toMatchObject({ state: 'ready', aiIncluded: false, total: 0, checked: 0 });
    expect(res.checkedAt).not.toBeNull();
    expect(res.duplicates).toHaveLength(1);
    const [group] = res.duplicates;
    expect(group).toMatchObject({
      reason: 'same-address',
      source: 'rule',
      keepReason: 'in-folder',
    });
    expect(group?.keep.id).toBe(filed);
    expect(group?.copies.map((link) => link.id).sort()).toEqual([first, third].sort());
    expect(await report()).toEqual(res);

    const stored = await t.db.prisma.cleanupReport.findUniqueOrThrow({
      where: { userId: owner() },
    });
    const text = JSON.stringify(stored.findings);
    expect(text).not.toContain('coat');
    expect(text).not.toContain('example');
  });

  it('reads the report live: trashed members and groups below two drop out', async () => {
    const one = await coat(owner());
    const two = await coat(owner());
    const keepRow = await seedLink(t.db.prisma, owner(), { url: 'https://a.example.test/x' });
    const trashedRow = await seedLink(t.db.prisma, owner(), { url: 'https://a.example.test/x' });
    await seedLink(t.db.prisma, owner(), { url: 'https://a.example.test/x' });
    await run();
    expect((await report()).duplicates).toHaveLength(2);

    await t.db.prisma.link.update({ where: { id: two }, data: { deletedAt: new Date() } });
    await t.db.prisma.link.update({ where: { id: trashedRow }, data: { deletedAt: new Date() } });
    const live = await report();
    expect(live.duplicates).toHaveLength(1);
    expect([
      live.duplicates[0]?.keep.id,
      ...(live.duplicates[0]?.copies ?? []).map((l) => l.id),
    ]).toContain(keepRow);
    expect(JSON.stringify(live)).not.toContain(one);
  });

  it('pairs tag variants by rule and keeps the tag on more live links', async () => {
    await seedLink(t.db.prisma, owner(), { tags: ['recipes'] });
    await seedLink(t.db.prisma, owner(), { tags: ['recipes', 'Front-End'] });
    await seedLink(t.db.prisma, owner(), { tags: ['Recipe', 'frontend', 'news'] });
    await seedLink(t.db.prisma, owner(), { tags: ['new'] });

    const res = await run();
    const pairs = res.similarTags.map((pair) => [pair.keep.name, pair.merge.name, pair.source]);
    expect(pairs).toHaveLength(2);
    expect(pairs).toContainEqual(['recipes', 'Recipe', 'rule']);
    expect(res.similarTags.find((pair) => pair.keep.name === 'recipes')).toMatchObject({
      keep: { links: 2 },
      merge: { links: 1 },
    });

    const recipe = await t.db.prisma.tag.findFirstOrThrow({
      where: { userId: owner(), name: 'Recipe' },
    });
    await t.db.prisma.tag.delete({ where: { id: recipe.id } });
    expect((await report()).similarTags).toHaveLength(1);
  });

  it('replaces the report on each run and refuses a run while one is running', async () => {
    await coat(owner());
    await coat(owner());
    const first = await run();
    const second = await run();
    expect(second.duplicates[0]?.id).not.toBe(first.duplicates[0]?.id);

    await t.db.prisma.cleanupReport.update({
      where: { userId: owner() },
      data: { state: 'running', progressAt: new Date() },
    });
    const conflict = await a.post(CLEANUP_ENDPOINT.Run).send({ includeAi: false }).expect(409);
    expect(conflict.body).toMatchObject({ statusCode: 409, message: expect.any(String) });

    // A run stalled for over a day no longer blocks.
    await t.db.prisma.cleanupReport.update({
      where: { userId: owner() },
      data: { progressAt: daysAgo(2) },
    });
    expect((await run()).state).toBe('ready');
  });

  it('validates the run body', async () => {
    await a.post(CLEANUP_ENDPOINT.Run).send({}).expect(400);
    await a.post(CLEANUP_ENDPOINT.Run).send({ includeAi: 'yes' }).expect(400);
    await a.post(CLEANUP_ENDPOINT.Run).send({ includeAi: false, extra: 1 }).expect(400);
  });

  it('runs rule checks without AI checks for Free or AI off', async () => {
    const res = await run(a, true);
    expect(res).toMatchObject({ state: 'ready', aiIncluded: false, aiAvailable: false });
    expect(deferrer.size).toBe(0);
  });

  it('never groups or counts another user’s links or tags', async () => {
    await coat(owner());
    await coat(intruder());
    await seedLink(t.db.prisma, owner(), { tags: ['recipe'] });
    await seedLink(t.db.prisma, intruder(), { tags: ['recipes'] });
    expect(await run()).toMatchObject({ duplicates: [], similarTags: [] });
    await coat(intruder());
    await run(b);
    expect((await report()).duplicates).toEqual([]);
    expect((await report(b)).duplicates).toHaveLength(1);
    expect(
      await t.db.prisma.cleanupReport.count({ where: { userId: owner(), state: 'ready' } }),
    ).toBe(1);
  });

  it('is data-isolated (expectIsolated over the report list)', async () => {
    await expectIsolated(t.app, users, {
      create: async () => {
        const id = await coat(owner());
        await coat(owner());
        await run();
        return id;
      },
      read: (agent, id) => agent.get(`/api/links/${id}`),
      list: {
        request: (agent) => agent.get(CLEANUP_ENDPOINT.Report),
        ids: (body) =>
          (body as CleanupReport).duplicates.flatMap((group) => [
            group.keep.id,
            ...group.copies.map((link) => link.id),
          ]),
      },
      skip: {
        update: 'the report is replaced by a run of the session user only (covered above)',
        remove: 'the report has no delete route; DELETE /api/ai/data is covered in the AI specs',
        reference: 'no other resource refers to a clean-up report',
      },
    });
  });
});
