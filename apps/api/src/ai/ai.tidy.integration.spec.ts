import {
  AI_ENDPOINT,
  AI_ERROR_MESSAGE,
  LINK_LIMIT,
  type TidyApplyResponse,
  type TidyListResponse,
  type TidyUndoResponse,
} from '@shelfmark/contracts';
import { AwaitableDeferrer } from '../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { AiBackgroundService } from './background/ai-background.service';
import { AI_ENV } from './models/ai-env.const';

describe('Tidy Unsorted (AI-2)', () => {
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

  const turnOn = (agent: TestAgent = a) =>
    agent.patch(AI_ENDPOINT.Settings).send({ enabled: true }).expect(200);
  const turnOff = (agent: TestAgent = a) =>
    agent.patch(AI_ENDPOINT.Settings).send({ enabled: false }).expect(200);
  const folder = async (userId: string, name: string, deleted = false): Promise<string> =>
    (
      await t.db.prisma.folder.create({
        data: { userId, name, ...(deleted ? { deletedAt: new Date() } : {}) },
      })
    ).id;
  const suggest = async (
    userId: string,
    linkId: string,
    target: { folderId: string } | { tagName: string; kind?: 'tag' | 'new-tag' },
    state = 'suggested',
  ): Promise<string> => {
    const data =
      'folderId' in target
        ? { kind: 'folder', folderId: target.folderId }
        : { kind: target.kind ?? 'tag', tagName: target.tagName };
    return (await t.db.prisma.linkSuggestion.create({ data: { userId, linkId, state, ...data } }))
      .id;
  };
  const list = async (agent: TestAgent = a): Promise<TidyListResponse> =>
    (await agent.get(AI_ENDPOINT.Tidy).expect(200)).body as TidyListResponse;
  const count = async (agent: TestAgent = a): Promise<number> =>
    ((await agent.get(AI_ENDPOINT.TidyCount).expect(200)).body as { total: number }).total;
  const apply = (items: { linkId: string; suggestionIds: string[] }[], agent: TestAgent = a) =>
    agent.post(AI_ENDPOINT.TidyApply).send({ items });
  const linkRow = (id: string) =>
    t.db.prisma.link.findUniqueOrThrow({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });
  const tagNamesOf = async (id: string) =>
    (await linkRow(id)).tags.map((entry) => entry.tag.name).sort();
  const stateOf = async (id: string) =>
    (await t.db.prisma.linkSuggestion.findUniqueOrThrow({ where: { id } })).state;

  /** One Unsorted link with a folder, an existing tag and a new tag suggested. */
  const seeded = async (userId = users.owner.userId, url = 'https://example.test/a') => {
    const videos = await folder(userId, 'Videos');
    await seedLink(t.db.prisma, userId, { tags: ['css'] });
    const link = await seedLink(t.db.prisma, userId, { url, title: 'A' });
    const f = await suggest(userId, link, { folderId: videos });
    const css = await suggest(userId, link, { tagName: 'css' });
    const fresh = await suggest(userId, link, { tagName: 'fresh', kind: 'new-tag' });
    return { videos, link, f, css, fresh };
  };

  describe('GET /api/ai/tidy and /count', () => {
    it('is empty while AI is off', async () => {
      await seeded();
      expect(await list()).toEqual({ items: [], total: 0 });
      expect(await count()).toBe(0);
    });

    it('lists Unsorted links with their open suggestions, newest first', async () => {
      await turnOn();
      const { videos, link, f, css, fresh } = await seeded();
      const older = await seedLink(t.db.prisma, users.owner.userId, {
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const olderTag = await suggest(users.owner.userId, older, { tagName: 'css' });
      const body = await list();
      expect(body.total).toBe(2);
      expect(body.items.map((item) => item.link.id)).toEqual([link, older]);
      expect(body.items[0]?.suggestions).toEqual([
        { id: f, kind: 'folder', state: 'suggested', tagName: null, folderId: videos },
        { id: css, kind: 'tag', state: 'suggested', tagName: 'css', folderId: null },
        { id: fresh, kind: 'new-tag', state: 'suggested', tagName: 'fresh', folderId: null },
      ]);
      expect(body.items[1]?.suggestions.map((s) => s.id)).toEqual([olderTag]);
      expect(await count()).toBe(2);
    });

    it('leaves out filed and trashed links, decided rows and rows that no longer apply', async () => {
      await turnOn();
      const owner = users.owner.userId;
      const videos = await folder(owner, 'Videos');
      const trashed = await folder(owner, 'Old', true);
      const filed = await seedLink(t.db.prisma, owner, { folderId: videos });
      await suggest(owner, filed, { tagName: 'css' });
      const gone = await seedLink(t.db.prisma, owner);
      await suggest(owner, gone, { tagName: 'css' });
      await t.db.prisma.link.update({ where: { id: gone }, data: { deletedAt: new Date() } });
      const decided = await seedLink(t.db.prisma, owner);
      await suggest(owner, decided, { tagName: 'css' }, 'accepted');
      await suggest(owner, decided, { tagName: 'design' }, 'dismissed');
      await suggest(owner, decided, { tagName: 'auto' }, 'auto-applied');
      const stale = await seedLink(t.db.prisma, owner, { tags: ['css'] });
      await suggest(owner, stale, { tagName: 'CSS' });
      await suggest(owner, stale, { folderId: trashed });
      expect(await list()).toEqual({ items: [], total: 0 });
    });

    it('lets a rule with a live folder win over the folder suggestion, not one in Trash', async () => {
      await turnOn();
      const owner = users.owner.userId;
      const { link, css, fresh } = await seeded(owner, 'https://www.youtube.com/watch?v=1');
      const music = await folder(owner, 'Music');
      await t.db.prisma.linkRule.create({
        data: { userId: owner, domain: 'youtube.com', folderId: music },
      });
      expect((await list()).items[0]?.suggestions.map((s) => s.id)).toEqual([css, fresh]);
      await t.db.prisma.folder.update({ where: { id: music }, data: { deletedAt: new Date() } });
      expect((await list()).items[0]?.suggestions).toHaveLength(3);
      expect((await list()).items[0]?.link.id).toBe(link);
    });

    it('reads a new tag whose name exists now as a tag', async () => {
      await turnOn();
      const { fresh } = await seeded();
      await seedLink(t.db.prisma, users.owner.userId, { tags: ['Fresh'] });
      const item = (await list()).items[0];
      expect(item?.suggestions.find((s) => s.id === fresh)?.kind).toBe('tag');
    });
  });

  describe('POST /api/ai/tidy/apply', () => {
    it('moves and tags in one run, accepts the applied rows and keeps the rest open', async () => {
      await turnOn();
      const { videos, link, f, css, fresh } = await seeded();
      const response = await apply([{ linkId: link, suggestionIds: [f, fresh] }]).expect(200);
      const body = response.body as TidyApplyResponse;
      expect(body).toMatchObject({ applied: 1, folders: 1, tagsAdded: 1, skipped: 0 });
      expect(body.undo).toEqual({
        items: [{ linkId: link, folderId: videos, tags: ['fresh'], suggestionIds: [f, fresh] }],
      });
      expect(body.links).toHaveLength(1);
      expect(body.links[0]).toMatchObject({ id: link, folderId: videos, tags: ['fresh'] });
      expect((await linkRow(link)).folderId).toBe(videos);
      expect(await tagNamesOf(link)).toEqual(['fresh']);
      expect([await stateOf(f), await stateOf(fresh), await stateOf(css)]).toEqual([
        'accepted',
        'accepted',
        'suggested',
      ]);
      expect(await count()).toBe(0);
    });

    it('never replaces a folder the user chose meanwhile, but still adds the tags', async () => {
      await turnOn();
      const { link, f, css } = await seeded();
      const reading = await folder(users.owner.userId, 'Reading');
      await t.db.prisma.link.update({ where: { id: link }, data: { folderId: reading } });
      const body = (await apply([{ linkId: link, suggestionIds: [f, css] }]).expect(200))
        .body as TidyApplyResponse;
      expect(body).toMatchObject({ applied: 1, folders: 0, tagsAdded: 1 });
      expect((await linkRow(link)).folderId).toBe(reading);
      expect(await tagNamesOf(link)).toEqual(['css']);
      expect(await stateOf(f)).toBe('suggested');
    });

    it('leaves tags past the per-link limit off and counts them as skipped', async () => {
      await turnOn();
      const owner = users.owner.userId;
      const names = Array.from({ length: LINK_LIMIT.TagsMax - 1 }, (_, i) => `t${i}`);
      const link = await seedLink(t.db.prisma, owner, { tags: names });
      const one = await suggest(owner, link, { tagName: 'one', kind: 'new-tag' });
      const two = await suggest(owner, link, { tagName: 'two', kind: 'new-tag' });
      const body = (await apply([{ linkId: link, suggestionIds: [one, two] }]).expect(200))
        .body as TidyApplyResponse;
      expect(body).toMatchObject({ applied: 1, tagsAdded: 1, skipped: 1 });
      expect((await linkRow(link)).tags).toHaveLength(LINK_LIMIT.TagsMax);
      expect(await stateOf(two)).toBe('suggested');
    });

    it('ignores ids that are not open suggestions of that link', async () => {
      await turnOn();
      const first = await seeded();
      const second = await seeded(users.owner.userId, 'https://example.test/b');
      const body = (
        await apply([
          { linkId: first.link, suggestionIds: [second.css, crypto.randomUUID()] },
        ]).expect(200)
      ).body as TidyApplyResponse;
      expect(body).toEqual({
        links: [],
        applied: 0,
        folders: 0,
        tagsAdded: 0,
        skipped: 0,
        undo: { items: [] },
      });
      expect(await stateOf(second.css)).toBe('suggested');
    });

    it('is refused while AI is off and validates the body', async () => {
      const { link, f } = await seeded();
      const off = await apply([{ linkId: link, suggestionIds: [f] }]).expect(409);
      expect((off.body as { message: string }).message).toBe(AI_ERROR_MESSAGE.AiOff);
      await turnOn();
      await apply([]).expect(400);
      await apply([
        { linkId: link, suggestionIds: [f] },
        { linkId: link, suggestionIds: [f] },
      ]).expect(400);
      await apply([{ linkId: link, suggestionIds: [] }]).expect(400);
      await apply([{ linkId: 'nope', suggestionIds: [f] }]).expect(400);
      await a
        .post(AI_ENDPOINT.TidyApply)
        .send({ items: [{ linkId: link, suggestionIds: [f], extra: 1 }] })
        .expect(400);
      expect((await linkRow(link)).folderId).toBeNull();
    });

    it('does not deadlock with a folder delete running at the same time', async () => {
      await turnOn();
      const { videos, link, f, css } = await seeded();
      const [applied, deleted] = await Promise.all([
        apply([{ linkId: link, suggestionIds: [f, css] }]),
        a.delete(`/api/folders/${videos}?mode=move-to-unsorted`),
      ]);
      expect(applied.status).toBe(200);
      expect(deleted.status).toBe(204);
      const row = await linkRow(link);
      // Either order is fine; the link never ends up in a folder in Trash.
      expect(row.folderId).toBeNull();
      expect(await tagNamesOf(link)).toEqual(['css']);
    });
  });

  describe('POST /api/ai/tidy/undo', () => {
    const undo = (body: object, agent: TestAgent = a) =>
      agent.post(AI_ENDPOINT.TidyUndo).send(body);

    it('reverts the run exactly and opens the suggestions again, also with AI off', async () => {
      await turnOn();
      const { link, f, css, fresh } = await seeded();
      const applied = (await apply([{ linkId: link, suggestionIds: [f, css, fresh] }]).expect(200))
        .body as TidyApplyResponse;
      await turnOff();
      const body = (await undo(applied.undo).expect(200)).body as TidyUndoResponse;
      expect(body.links).toHaveLength(1);
      expect(body.links[0]).toMatchObject({ id: link, folderId: null, tags: [] });
      expect(await tagNamesOf(link)).toEqual([]);
      expect([await stateOf(f), await stateOf(css), await stateOf(fresh)]).toEqual([
        'suggested',
        'suggested',
        'suggested',
      ]);
      // The new tag stays as an empty tag, like the bulk tag Undo.
      expect(
        await t.db.prisma.tag.count({ where: { userId: users.owner.userId, name: 'fresh' } }),
      ).toBe(1);
      await turnOn();
      expect(await count()).toBe(1);
    });

    it('leaves a later user change alone', async () => {
      await turnOn();
      const { link, f, css } = await seeded();
      const applied = (await apply([{ linkId: link, suggestionIds: [f, css] }]).expect(200))
        .body as TidyApplyResponse;
      const reading = await folder(users.owner.userId, 'Reading');
      await t.db.prisma.link.update({ where: { id: link }, data: { folderId: reading } });
      await undo(applied.undo).expect(200);
      const row = await linkRow(link);
      expect(row.folderId).toBe(reading);
      expect(await tagNamesOf(link)).toEqual([]);
    });

    it('validates the body', async () => {
      await undo({ items: [] }).expect(400);
      await undo({
        items: [{ linkId: crypto.randomUUID(), folderId: 'x', tags: [], suggestionIds: [] }],
      }).expect(400);
      await undo({ items: [{ linkId: crypto.randomUUID(), tags: [], suggestionIds: [] }] }).expect(
        400,
      );
      expect(
        (
          await undo({
            items: [{ linkId: crypto.randomUUID(), folderId: null, tags: [], suggestionIds: [] }],
          }).expect(200)
        ).body,
      ).toEqual({ links: [] });
    });
  });

  describe('data isolation', () => {
    it('never lists or counts the other user’s links', async () => {
      await turnOn(b);
      await turnOn();
      await expectIsolated(t.app, users, {
        create: async () => (await seeded()).link,
        read: (agent, id) => agent.get(`/api/links/${id}`),
        list: {
          request: (agent) => agent.get(AI_ENDPOINT.Tidy),
          ids: (body) => (body as TidyListResponse).items.map((item) => item.link.id),
        },
        skip: {
          update: 'Tidy apply ignores foreign ids with 200; covered by the apply isolation test',
          remove: 'Tidy has no delete',
          reference: 'Tidy has no route that references a link by id in a path',
        },
      });
      expect(await count(b)).toBe(0);
    });

    it("applies nothing with the other user's link or suggestion ids", async () => {
      await turnOn(b);
      await turnOn();
      const theirs = await seeded(users.intruder.userId);
      const mine = await seeded();
      const foreignLink = (
        await apply([{ linkId: theirs.link, suggestionIds: [theirs.f, theirs.css] }]).expect(200)
      ).body as TidyApplyResponse;
      expect(foreignLink.applied).toBe(0);
      const foreignRows = (
        await apply([{ linkId: mine.link, suggestionIds: [theirs.f, theirs.css] }]).expect(200)
      ).body as TidyApplyResponse;
      expect(foreignRows.applied).toBe(0);
      expect((await linkRow(theirs.link)).folderId).toBeNull();
      expect(await stateOf(theirs.f)).toBe('suggested');
      expect(await stateOf(theirs.css)).toBe('suggested');
      expect(await count(b)).toBe(1);
    });

    it("undoes nothing of the other user's", async () => {
      await turnOn(b);
      const theirs = await seeded(users.intruder.userId);
      const applied = (
        await apply([{ linkId: theirs.link, suggestionIds: [theirs.f, theirs.css] }], b).expect(200)
      ).body as TidyApplyResponse;
      const body = (await a.post(AI_ENDPOINT.TidyUndo).send(applied.undo).expect(200))
        .body as TidyUndoResponse;
      expect(body).toEqual({ links: [] });
      expect((await linkRow(theirs.link)).folderId).toBe(theirs.videos);
      expect(await tagNamesOf(theirs.link)).toEqual(['css']);
      expect(await stateOf(theirs.f)).toBe('accepted');
    });
  });
});
