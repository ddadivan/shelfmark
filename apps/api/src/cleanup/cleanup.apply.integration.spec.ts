import {
  AI_ENDPOINT,
  CLEANUP_ENDPOINT,
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
    (await agent.post(CLEANUP_ENDPOINT.Undo).send(payload).expect(200)).body as {
      restored: number;
      unmerged: number;
    };
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
    await anonymous(t.app)
      .post(CLEANUP_ENDPOINT.Undo)
      .send({ deletedAt: null, trashedIds: [], merges: [] })
      .expect(401);
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
    await a
      .post(CLEANUP_ENDPOINT.Undo)
      .send({ deletedAt: 'yesterday', trashedIds: [], merges: [] })
      .expect(400);
    await a
      .post(CLEANUP_ENDPOINT.Undo)
      .send({
        deletedAt: null,
        trashedIds: [],
        merges: [{ keptTagId: owner(), mergedName: 'a\u0000b', linkIds: [], addedLinkIds: [] }],
      })
      .expect(400);
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
    expect(res.undo.trashedIds.sort()).toEqual([...trashIds].sort());
    const rows = await t.db.prisma.link.findMany({ where: { id: { in: trashIds } } });
    expect(new Set(rows.map((row) => row.deletedAt?.toISOString()))).toEqual(
      new Set([res.undo.deletedAt]),
    );
    expect(rows.every((row) => row.pinnedPosition === null)).toBe(true);
    expect(await live([group.keep.id])).toBe(1);
    expect(
      (await t.db.prisma.cleanupReport.findUniqueOrThrow({ where: { userId: owner() } })).state,
    ).toBe('applied');
    expect((await a.get(CLEANUP_ENDPOINT.Report).expect(200)).body.duplicates).toEqual([]);

    expect(await undo(res.undo)).toEqual({ restored: 2, unmerged: 0 });
    expect(await live(ids)).toBe(3);
    expect(
      (await t.db.prisma.cleanupReport.findUniqueOrThrow({ where: { userId: owner() } })).state,
    ).toBe('ready');
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
    expect(res.undo).toEqual({ deletedAt: null, trashedIds: [], merges: [] });
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
    expect(res.undo.merges).toEqual([
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
    expect(
      await undo(
        {
          deletedAt: bApply.undo.deletedAt,
          trashedIds: bApply.undo.trashedIds,
          merges: [
            {
              keptTagId: pair.keep.id,
              mergedName: 'stolen',
              linkIds: theirs,
              addedLinkIds: [theirSingle],
            },
          ],
        },
        a,
      ),
    ).toEqual({ restored: 0, unmerged: 1 });
    expect(await live(theirs)).toBe(1);
    expect(await tagNames(theirs[0] ?? '')).not.toContain('stolen');
    expect(await t.db.prisma.tag.count({ where: { userId: intruder(), name: 'stolen' } })).toBe(0);
    expect(await tagNames(theirSingle)).toEqual(['Recipe']);
    expect(
      (await t.db.prisma.cleanupReport.findUniqueOrThrow({ where: { userId: intruder() } })).state,
    ).toBe('applied');
  });
});
