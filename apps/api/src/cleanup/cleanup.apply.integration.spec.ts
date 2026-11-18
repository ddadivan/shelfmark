import { randomUUID } from 'node:crypto';
import {
  AI_ENDPOINT,
  CLEANUP_ENDPOINT,
  CLEANUP_ERROR_MESSAGE,
  normalizeUrl,
  type CleanupApplyResponse,
  type CleanupReport,
} from '@shelfmark/contracts';
import { AwaitableDeferrer } from '../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { AiBackgroundService } from '../ai/background/ai-background.service';
import { AI_ENV } from '../ai/models/ai-env.const';
import { readStoredUndo } from './read-stored-undo';

describe('Clean-up apply and Undo (AI-5)', () => {
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
  const run = async (agent: TestAgent = a) =>
    (await agent.post(CLEANUP_ENDPOINT.Run).send({ includeAi: false }).expect(200))
      .body as CleanupReport;
  const apply = async (
    body: { duplicates?: unknown[]; tagMerges?: unknown[] },
    agent: TestAgent = a,
  ) =>
    (
      await agent
        .post(CLEANUP_ENDPOINT.Apply)
        .send({ duplicates: [], tagMerges: [], ...body })
        .expect(200)
    ).body as CleanupApplyResponse;
  const undo = async (payload: CleanupApplyResponse['undo'], agent: TestAgent = a) =>
    (
      await agent
        .post(CLEANUP_ENDPOINT.Undo)
        .send(payload ?? {})
        .expect(200)
    ).body as {
      restored: number;
      unmerged: number;
    };
  const undoRefused = async (payload: CleanupApplyResponse['undo'], agent: TestAgent = a) => {
    const res = await agent
      .post(CLEANUP_ENDPOINT.Undo)
      .send(payload ?? {})
      .expect(409);
    expect(res.body.message).toBe(CLEANUP_ERROR_MESSAGE.UndoGone);
  };
  const storedUndo = async (userId: string) =>
    readStoredUndo(
      (await t.db.prisma.cleanupReport.findUniqueOrThrow({ where: { userId } })).undoData,
    );
  const copies = async (
    userId: string,
    count: number,
    extra: Parameters<typeof seedLink>[2] = {},
  ): Promise<string[]> => {
    const ids: string[] = [];
    for (let n = 0; n < count; n += 1) {
      ids.push(
        await seedLink(t.db.prisma, userId, { url: 'https://shop.example.test/coat', ...extra }),
      );
    }
    return ids;
  };
  const live = (ids: string[]) =>
    t.db.prisma.link.count({ where: { id: { in: ids }, deletedAt: null } });
  const tagNames = async (linkId: string) =>
    (await t.db.prisma.linkTag.findMany({ where: { linkId }, include: { tag: true } }))
      .map((row) => row.tag.name)
      .sort();

  it('needs a session and a valid, non-empty body', async () => {
    await anonymous(t.app)
      .post(CLEANUP_ENDPOINT.Apply)
      .send({ duplicates: [], tagMerges: [] })
      .expect(401);
    await anonymous(t.app).post(CLEANUP_ENDPOINT.Undo).send({ runId: randomUUID() }).expect(401);
    await a.post(CLEANUP_ENDPOINT.Apply).send({ duplicates: [], tagMerges: [] }).expect(400);
    await a.post(CLEANUP_ENDPOINT.Apply).send({ duplicates: [] }).expect(400);
    await a
      .post(CLEANUP_ENDPOINT.Apply)
      .send({ duplicates: [{ groupId: 'bad id!', trashIds: [owner()] }], tagMerges: [] })
      .expect(400);
    await a
      .post(CLEANUP_ENDPOINT.Apply)
      .send({ duplicates: [{ groupId: 'g1', trashIds: ['x'] }], tagMerges: [] })
      .expect(400);
    await a.post(CLEANUP_ENDPOINT.Undo).send({}).expect(400);
    await a.post(CLEANUP_ENDPOINT.Undo).send({ runId: 'yesterday' }).expect(400);
    // The old client-held payload is no longer accepted (whitelist + forbidNonWhitelisted).
    await a
      .post(CLEANUP_ENDPOINT.Undo)
      .send({ runId: randomUUID(), deletedAt: null, trashedIds: [], merges: [] })
      .expect(400);
    // An unknown run id changes nothing.
    await undoRefused({ runId: randomUUID() });
  });

  it('moves the selected copies to Trash with one shared time and Undo restores them', async () => {
    const ids = await copies(owner(), 3);
    await t.db.prisma.link.update({ where: { id: ids[1] }, data: { pinnedPosition: 1 } });
    const report = await run();
    const group = report.duplicates[0];
    if (group === undefined) throw new Error('no group');
    const trashIds = group.copies.map((link) => link.id);

    const res = await apply({ duplicates: [{ groupId: group.id, trashIds }] });
    expect(res).toMatchObject({ trashed: 2, merged: 0, skipped: 0 });
    expect(res.trashedIds.sort()).toEqual([...trashIds].sort());
    expect(Object.keys(res.undo ?? {})).toEqual(['runId']);
    const rows = await t.db.prisma.link.findMany({ where: { id: { in: trashIds } } });
    const stored = await storedUndo(owner());
    expect(new Set(rows.map((row) => row.deletedAt?.toISOString()))).toEqual(
      new Set([stored?.deletedAt]),
    );
    expect(rows.every((row) => row.pinnedPosition === null)).toBe(true);
    expect(await live([group.keep.id])).toBe(1);
    expect(
      (await t.db.prisma.cleanupReport.findUniqueOrThrow({ where: { userId: owner() } })).state,
    ).toBe('applied');
    expect((await a.get(CLEANUP_ENDPOINT.Report).expect(200)).body.duplicates).toEqual([]);

    expect(await undo(res.undo)).toEqual({ restored: 2, unmerged: 0 });
    expect(await live(ids)).toBe(3);
    const after = await t.db.prisma.cleanupReport.findUniqueOrThrow({ where: { userId: owner() } });
    expect(after).toMatchObject({
      state: 'ready',
      undoRunId: null,
      undoData: null,
      undoUntil: null,
    });
  });

  it('refuses a replayed, expired or superseded Undo and changes nothing', async () => {
    await copies(owner(), 3);
    const group = (await run()).duplicates[0];
    if (group === undefined) throw new Error('no group');
    const [first, second] = group.copies.map((link) => link.id);
    if (first === undefined || second === undefined) throw new Error('no copies');

    const one = await apply({ duplicates: [{ groupId: group.id, trashIds: [first] }] });
    const two = await apply({ duplicates: [{ groupId: group.id, trashIds: [second] }] });
    // Only the latest run can be undone.
    await undoRefused(one.undo);
    expect(await live([first])).toBe(0);
    expect(await undo(two.undo)).toEqual({ restored: 1, unmerged: 0 });
    // Single-use: the replay is refused, and the user's re-trash of the link stays.
    await t.db.prisma.link.update({ where: { id: second }, data: { deletedAt: new Date() } });
    await undoRefused(two.undo);
    expect(await live([second])).toBe(0);

    const three = await apply({ duplicates: [{ groupId: group.id, trashIds: [first] }] });
    expect(three.trashed).toBe(0);
    await t.db.prisma.link.update({ where: { id: first }, data: { deletedAt: null } });
    const four = await apply({ duplicates: [{ groupId: group.id, trashIds: [first] }] });
    await t.db.prisma.cleanupReport.update({
      where: { userId: owner() },
      data: { undoUntil: new Date(Date.now() - 1000) },
    });
    await undoRefused(four.undo);
    expect(await live([first])).toBe(0);
  });

  it('undoes a merge of a tag on more links than an Undo body could carry', async () => {
    const count = 1500;
    await seedLink(t.db.prisma, owner(), { tags: ['recipes'] });
    const both = await seedLink(t.db.prisma, owner(), { tags: ['recipes', 'Recipe'] });
    const merged = await t.db.prisma.tag.findFirstOrThrow({
      where: { userId: owner(), name: 'Recipe' },
    });
    const links = await t.db.prisma.link.createManyAndReturn({
      data: Array.from({ length: count }, (_, n) => {
        const url = `https://bulk.test/${n}`;
        return {
          userId: owner(),
          url,
          normalizedUrl: normalizeUrl(url),
          title: `Bulk ${n}`,
          titleSortKey: `bulk ${n}`,
        };
      }),
      select: { id: true },
    });
    await t.db.prisma.linkTag.createMany({
      data: links.map((link) => ({ linkId: link.id, tagId: merged.id })),
    });
    const pair = (await run()).similarTags[0];
    if (pair === undefined) throw new Error('no pair');
    expect(pair.keep.name).toBe('Recipe');
    // Keep the rarer tag: Undo must hand 'Recipe' back to every bulk link and take 'recipes' off.
    const res = await apply({ tagMerges: [{ pairId: pair.id, keepTagId: pair.merge.id }] });
    expect(res.merged).toBe(1);
    expect(JSON.stringify(res.undo).length).toBeLessThan(100);
    const stored = await storedUndo(owner());
    expect(stored?.merges[0]?.linkIds).toHaveLength(count + 1);
    expect(stored?.merges[0]?.addedLinkIds).toHaveLength(count);

    expect(await undo(res.undo)).toEqual({ restored: 0, unmerged: 1 });
    const back = await t.db.prisma.tag.findFirstOrThrow({
      where: { userId: owner(), name: 'Recipe' },
      include: { _count: { select: { links: true } } },
    });
    expect(back._count.links).toBe(count + 1);
    expect(await tagNames(both)).toEqual(['Recipe', 'recipes']);
    expect(await tagNames(links[0]?.id ?? '')).toEqual(['Recipe']);
  });

  it('never trashes every member and skips ids outside the report', async () => {
    const ids = await copies(owner(), 2);
    const other = await seedLink(t.db.prisma, owner(), { url: 'https://else.test/' });
    const report = await run();
    const group = report.duplicates[0];
    if (group === undefined) throw new Error('no group');

    const res = await apply({
      duplicates: [
        { groupId: group.id, trashIds: ids },
        { groupId: 'missing', trashIds: [ids[0]] },
        { groupId: group.id, trashIds: [other] },
      ],
    });
    expect(res).toMatchObject({ trashed: 0, merged: 0, skipped: 3 });
    expect(await live([...ids, other])).toBe(3);
    expect(res).toMatchObject({ trashedIds: [], undo: null });
    expect(await storedUndo(owner())).toBeNull();
  });

  it('merges a pair, either way round, and Undo splits the tags again', async () => {
    const both = await seedLink(t.db.prisma, owner(), { tags: ['recipes', 'Recipe'] });
    const many = await seedLink(t.db.prisma, owner(), { tags: ['recipes'] });
    const single = await seedLink(t.db.prisma, owner(), { tags: ['Recipe'] });
    const report = await run();
    const pair = report.similarTags[0];
    if (pair === undefined) throw new Error('no pair');
    expect(pair.keep.name).toBe('recipes');

    const res = await apply({ tagMerges: [{ pairId: pair.id, keepTagId: pair.keep.id }] });
    expect(res).toMatchObject({ trashed: 0, merged: 1, skipped: 0 });
    expect((await storedUndo(owner()))?.merges).toEqual([
      {
        keptTagId: pair.keep.id,
        mergedName: 'Recipe',
        linkIds: expect.arrayContaining([both, single]),
        addedLinkIds: [single],
      },
    ]);
    expect(await tagNames(single)).toEqual(['recipes']);
    expect(await t.db.prisma.tag.count({ where: { userId: owner(), name: 'Recipe' } })).toBe(0);

    expect(await undo(res.undo)).toEqual({ restored: 0, unmerged: 1 });
    expect(await tagNames(single)).toEqual(['Recipe']);
    expect(await tagNames(both)).toEqual(['Recipe', 'recipes']);
    expect(await tagNames(many)).toEqual(['recipes']);
  });

  it('keeps the other tag of the pair when asked, and skips a pair whose tag is gone', async () => {
    await seedLink(t.db.prisma, owner(), { tags: ['recipes'] });
    await seedLink(t.db.prisma, owner(), { tags: ['recipes'] });
    const single = await seedLink(t.db.prisma, owner(), { tags: ['Recipe'] });
    const report = await run();
    const pair = report.similarTags[0];
    if (pair === undefined) throw new Error('no pair');

    const swapped = await apply({ tagMerges: [{ pairId: pair.id, keepTagId: pair.merge.id }] });
    expect(swapped.merged).toBe(1);
    expect(await tagNames(single)).toEqual(['Recipe']);
    expect(await t.db.prisma.tag.count({ where: { userId: owner() } })).toBe(1);

    const again = await apply({ tagMerges: [{ pairId: pair.id, keepTagId: pair.merge.id }] });
    expect(again).toMatchObject({ merged: 0, skipped: 1 });
    const wrongTag = await apply({ tagMerges: [{ pairId: pair.id, keepTagId: owner() }] });
    expect(wrongTag.skipped).toBe(1);
  });

  it('marks the vectors of re-tagged links stale', async () => {
    await t.db.prisma.user.update({ where: { id: owner() }, data: { aiPack: true } });
    const one = await seedLink(t.db.prisma, owner(), { tags: ['recipes'] });
    const two = await seedLink(t.db.prisma, owner(), { tags: ['Recipe'] });
    await a
      .patch(AI_ENDPOINT.Settings)
      .send({ enabled: true, summaries: false, folderMode: 'off', tagsMode: 'off' })
      .expect(200);
    await deferrer.flush();
    expect(await t.db.prisma.linkEmbedding.count({ where: { stale: true } })).toBe(0);
    const pair = (await run()).similarTags[0];
    if (pair === undefined) throw new Error('no pair');
    await apply({ tagMerges: [{ pairId: pair.id, keepTagId: pair.keep.id }] });
    const stale = await t.db.prisma.linkEmbedding.findMany({ where: { stale: true } });
    expect(stale.map((row) => row.linkId)).toEqual([pair.keep.name === 'recipes' ? two : one]);
  });

  it('Undo leaves alone a link the user restored or re-trashed and reuses a tag made meanwhile', async () => {
    const ids = await copies(owner(), 3);
    await seedLink(t.db.prisma, owner(), { tags: ['recipes'] });
    await seedLink(t.db.prisma, owner(), { tags: ['recipes'] });
    const single = await seedLink(t.db.prisma, owner(), { tags: ['Recipe'] });
    const report = await run();
    const group = report.duplicates[0];
    const pair = report.similarTags[0];
    if (group === undefined || pair === undefined) throw new Error('no findings');
    const trashIds = group.copies.map((link) => link.id);
    const res = await apply({
      duplicates: [{ groupId: group.id, trashIds }],
      tagMerges: [{ pairId: pair.id, keepTagId: pair.keep.id }],
    });
    const [restoredByUser, retrashed] = trashIds;
    await t.db.prisma.link.update({ where: { id: restoredByUser }, data: { deletedAt: null } });
    await t.db.prisma.link.update({ where: { id: retrashed }, data: { deletedAt: new Date() } });
    const meanwhile = await t.db.prisma.tag.create({ data: { userId: owner(), name: 'recipe' } });

    expect(await undo(res.undo)).toEqual({ restored: 0, unmerged: 1 });
    expect(await live(ids)).toBe(2);
    expect(await tagNames(single)).toEqual(['recipe']);
    expect(await t.db.prisma.tag.count({ where: { userId: owner(), id: meanwhile.id } })).toBe(1);
  });

  it('never changes anything of another user through apply or Undo', async () => {
    const theirs = await copies(intruder(), 2, { tags: ['recipes'] });
    const theirSingle = await seedLink(t.db.prisma, intruder(), { tags: ['Recipe'] });
    const theirReport = await run(b);
    const group = theirReport.duplicates[0];
    const pair = theirReport.similarTags[0];
    if (group === undefined || pair === undefined) throw new Error('no findings');
    await copies(owner(), 2);
    await run(a);

    const res = await apply({
      duplicates: [{ groupId: group.id, trashIds: [group.copies[0]?.id] }],
      tagMerges: [{ pairId: pair.id, keepTagId: pair.keep.id }],
    });
    expect(res).toMatchObject({ trashed: 0, merged: 0, skipped: 2 });

    const bApply = await apply(
      { duplicates: [{ groupId: group.id, trashIds: [group.copies[0]?.id] }] },
      b,
    );
    expect(bApply.trashed).toBe(1);
    // Their run id is refused for the owner and leaves their Undo usable.
    await undoRefused(bApply.undo, a);
    expect(await live(theirs)).toBe(1);
    expect(await tagNames(theirSingle)).toEqual(['Recipe']);
    const theirRow = await t.db.prisma.cleanupReport.findUniqueOrThrow({
      where: { userId: intruder() },
    });
    expect(theirRow.state).toBe('applied');
    expect(theirRow.undoRunId).toBe(bApply.undo?.runId);
    expect(await undo(bApply.undo, b)).toEqual({ restored: 1, unmerged: 0 });
  });
});
