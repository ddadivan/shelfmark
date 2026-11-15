import {
  RULE_ENDPOINT,
  RULE_ERROR_MESSAGE,
  RULE_LIMIT,
  type CreateLinksBatchResponse,
  type FolderResponse,
  type LinkResponse,
  type ListRulesResponse,
  type RuleMatchesResponse,
  type RuleResponse,
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

const BASE = RULE_ENDPOINT;

describe('domain rules API', () => {
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

  const folder = async (name: string, agent: TestAgent = a): Promise<string> =>
    ((await agent.post('/api/folders').send({ name }).expect(201)).body as FolderResponse).id;
  const rule = async (
    body: { domain: string; folderId?: string | null; tags?: string[] },
    agent: TestAgent = a,
  ): Promise<RuleResponse> => (await agent.post(BASE).send(body).expect(201)).body as RuleResponse;
  const list = async (agent: TestAgent = a): Promise<RuleResponse[]> =>
    ((await agent.get(BASE).expect(200)).body as ListRulesResponse).items;
  const save = async (body: Record<string, unknown>, agent: TestAgent = a): Promise<LinkResponse> =>
    (
      await agent
        .post('/api/links')
        .send({ title: 'A page', ...body })
        .expect(201)
    ).body as LinkResponse;

  describe('CRUD', () => {
    it('normalises the domain and stores folder and tags', async () => {
      const videos = await folder('Videos');
      const created = await rule({
        domain: 'https://WWW.YouTube.com/watch?v=1',
        folderId: videos,
        tags: ['video', ' Video ', 'long watch'],
      });
      expect(created).toEqual({
        id: expect.any(String),
        domain: 'youtube.com',
        folderId: videos,
        folderAvailable: true,
        tags: ['video', 'long-watch'],
        createdAt: expect.any(String),
      });
      expect(await list()).toEqual([created]);
    });

    it('stores an international domain in punycode and sorts the list by domain', async () => {
      await rule({ domain: 'vimeo.com', tags: ['video'] });
      await rule({ domain: 'bücher.de', tags: ['books'] });
      await rule({ domain: 'a-b.example.com', tags: ['x'] });
      expect((await list()).map((item) => item.domain)).toEqual([
        'a-b.example.com',
        'vimeo.com',
        'xn--bcher-kva.de',
      ]);
    });

    it('edits and deletes a rule', async () => {
      const videos = await folder('Videos');
      const created = await rule({ domain: 'youtube.com', tags: ['video'] });
      const edited = (
        await a
          .patch(`${BASE}/${created.id}`)
          .send({ domain: 'm.youtube.com', folderId: videos, tags: [] })
          .expect(200)
      ).body as RuleResponse;
      expect(edited).toMatchObject({ domain: 'm.youtube.com', folderId: videos, tags: [] });
      await a.patch(`${BASE}/${created.id}`).send({ folderId: null }).expect(400);
      await a.delete(`${BASE}/${created.id}`).expect(204);
      await a.delete(`${BASE}/${created.id}`).expect(404);
      expect(await list()).toEqual([]);
    });

    it('refuses invalid domains, a rule that does nothing and too many tags', async () => {
      for (const domain of ['', 'localhost', '127.0.0.1', 'javascript:alert(1)', 'no spaces.com']) {
        await a
          .post(BASE)
          .send({ domain, tags: ['x'] })
          .expect(400);
      }
      const nothing = await a.post(BASE).send({ domain: 'example.com' }).expect(400);
      expect(nothing.body.message).toBe(RULE_ERROR_MESSAGE.NothingToDo);
      await a
        .post(BASE)
        .send({ domain: 'example.com', tags: ['1', '2', '3', '4', '5', '6'] })
        .expect(400);
      await a
        .post(BASE)
        .send({ domain: 'example.com', tags: ['a\u0000b'] })
        .expect(400);
      await a
        .post(BASE)
        .send({ domain: 'example.com', folderId: 'nope', tags: ['x'] })
        .expect(400);
    });

    it('keeps one rule per domain, www and case ignored', async () => {
      await rule({ domain: 'youtube.com', tags: ['video'] });
      const taken = await a
        .post(BASE)
        .send({ domain: 'WWW.youtube.com', tags: ['x'] })
        .expect(409);
      expect(taken.body.message).toBe(RULE_ERROR_MESSAGE.DomainTaken);
      const other = await rule({ domain: 'vimeo.com', tags: ['video'] });
      await a.patch(`${BASE}/${other.id}`).send({ domain: 'youtube.com' }).expect(409);
    });

    it(`stops at ${RULE_LIMIT.PerUserMax} rules`, async () => {
      await t.db.prisma.linkRule.createMany({
        data: Array.from({ length: RULE_LIMIT.PerUserMax }, (_, index) => ({
          userId: users.owner.userId,
          domain: `site${index}.example.com`,
          tagNames: ['x'],
        })),
      });
      const full = await a
        .post(BASE)
        .send({ domain: 'one-more.com', tags: ['x'] })
        .expect(409);
      expect(full.body.message).toBe(RULE_ERROR_MESSAGE.LimitReached);
    });

    it('needs a live own folder', async () => {
      const foreign = await folder('Theirs', asUser(t.app, users.intruder));
      await a.post(BASE).send({ domain: 'example.com', folderId: foreign }).expect(404);
      const trashed = await folder('Old');
      await a.delete(`/api/folders/${trashed}`).query({ mode: 'delete-links' }).expect(204);
      await a.post(BASE).send({ domain: 'example.com', folderId: trashed }).expect(404);
    });

    it('rules are isolated between users', async () => {
      await expectIsolated(t.app, users, {
        create: async (owner) =>
          (
            (
              await owner
                .post(BASE)
                .send({ domain: 'example.com', tags: ['x'] })
                .expect(201)
            ).body as RuleResponse
          ).id,
        read: (agent, id) => agent.get(`${BASE}/${id}/matches`),
        update: (agent, id) => agent.patch(`${BASE}/${id}`).send({ tags: ['hacked'] }),
        remove: (agent, id) => agent.delete(`${BASE}/${id}`),
        list: {
          request: (agent) => agent.get(BASE),
          ids: (body) => (body as ListRulesResponse).items.map((item) => item.id),
        },
        skip: {
          reference:
            'Nothing refers to a rule by id; a foreign folder in a rule is a 404 (folder test).',
        },
      });
    });
  });

  describe('applying on save', () => {
    it('puts a matching link into the folder with the tags, for subdomains and www too', async () => {
      const videos = await folder('Videos');
      await rule({ domain: 'youtube.com', folderId: videos, tags: ['video'] });
      for (const url of [
        'https://youtube.com/watch?v=1',
        'https://www.youtube.com/watch?v=2',
        'https://M.YouTube.com/watch?v=3',
      ]) {
        const link = await save({ url });
        expect(link.folderId).toBe(videos);
        expect(link.tags).toEqual(['video']);
      }
      const other = await save({ url: 'https://notyoutube.com/x' });
      expect(other.folderId).toBeNull();
      expect(other.tags).toEqual([]);
    });

    it('matches international domains written in Unicode or punycode', async () => {
      await rule({ domain: 'bücher.de', tags: ['books'] });
      expect((await save({ url: 'https://bücher.de/a' })).tags).toEqual(['books']);
      expect((await save({ url: 'https://xn--bcher-kva.de/b' })).tags).toEqual(['books']);
    });

    it('prefers the most specific rule', async () => {
      await rule({ domain: 'youtube.com', tags: ['video'] });
      await rule({ domain: 'music.youtube.com', tags: ['music'] });
      expect((await save({ url: 'https://music.youtube.com/a' })).tags).toEqual(['music']);
    });

    it('lets an explicit folder, explicit tags or applyRules false win', async () => {
      const videos = await folder('Videos');
      const reading = await folder('Reading');
      await rule({ domain: 'youtube.com', folderId: videos, tags: ['video'] });
      const chosenFolder = await save({ url: 'https://youtube.com/1', folderId: reading });
      expect(chosenFolder.folderId).toBe(reading);
      expect(chosenFolder.tags).toEqual(['video']);
      const chosenTags = await save({ url: 'https://youtube.com/2', tags: ['mine'] });
      expect(chosenTags.folderId).toBe(videos);
      expect(chosenTags.tags).toEqual(['mine']);
      const off = await save({ url: 'https://youtube.com/3', applyRules: false });
      expect(off.folderId).toBeNull();
      expect(off.tags).toEqual([]);
    });

    it('keeps saving when the folder is in Trash or deleted for good', async () => {
      const videos = await folder('Videos');
      const created = await rule({ domain: 'youtube.com', folderId: videos, tags: ['video'] });
      await a.delete(`/api/folders/${videos}`).query({ mode: 'delete-links' }).expect(204);
      expect((await list())[0]).toMatchObject({ folderId: videos, folderAvailable: false });
      const trashed = await save({ url: 'https://youtube.com/1' });
      expect(trashed.folderId).toBeNull();
      expect(trashed.tags).toEqual(['video']);
      // A kept trashed folder does not block other edits.
      await a
        .patch(`${BASE}/${created.id}`)
        .send({ tags: ['clip'] })
        .expect(200);

      await t.db.prisma.folder.delete({ where: { id: videos } });
      expect((await list())[0]).toMatchObject({ folderId: null, folderAvailable: true });
      expect((await save({ url: 'https://youtube.com/2' })).tags).toEqual(['clip']);
    });

    it("never applies another user's rule", async () => {
      await rule({ domain: 'youtube.com', tags: ['theirs'] }, asUser(t.app, users.intruder));
      expect((await save({ url: 'https://youtube.com/1' })).tags).toEqual([]);
    });

    it('applies per item in a batch, unless the batch chose folder or tags', async () => {
      const videos = await folder('Videos');
      const reading = await folder('Reading');
      await rule({ domain: 'youtube.com', folderId: videos, tags: ['video'] });
      await rule({ domain: 'vimeo.com', tags: ['clip'] });
      const key = (): string => globalThis.crypto.randomUUID();
      const batch = async (body: Record<string, unknown>): Promise<LinkResponse[]> =>
        ((await a.post('/api/links/batch').send(body).expect(201)).body as CreateLinksBatchResponse)
          .links;
      const links = await batch({
        items: [
          { url: 'https://youtube.com/a', idempotencyKey: key() },
          { url: 'https://vimeo.com/b', idempotencyKey: key() },
          { url: 'https://example.com/c', idempotencyKey: key() },
        ],
      });
      expect(links.map((link) => [link.folderId, link.tags])).toEqual([
        [videos, ['video']],
        [null, ['clip']],
        [null, []],
      ]);
      const chosen = await batch({
        folderId: reading,
        tags: ['mine'],
        items: [{ url: 'https://youtube.com/d', idempotencyKey: key() }],
      });
      expect(chosen.map((link) => [link.folderId, link.tags])).toEqual([[reading, ['mine']]]);
    });
  });

  describe('matches', () => {
    it('lists the live own links in Unsorted that the rule matches, newest first', async () => {
      const userId = users.owner.userId;
      const reading = await folder('Reading');
      const created = await rule({ domain: 'youtube.com', tags: ['video'] });
      const older = await seedLink(t.db.prisma, userId, {
        url: 'https://www.youtube.com/1',
        tags: ['video', 'fun'],
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const newer = await seedLink(t.db.prisma, userId, {
        url: 'https://m.youtube.com/2',
        createdAt: new Date('2026-02-01T00:00:00Z'),
      });
      await seedLink(t.db.prisma, userId, { url: 'https://youtube.com/3', folderId: reading });
      await seedLink(t.db.prisma, userId, { url: 'https://notyoutube.com/4' });
      await seedLink(t.db.prisma, userId, { url: 'https://example.com/?u=youtube.com' });
      const trashed = await seedLink(t.db.prisma, userId, { url: 'https://youtube.com/5' });
      await a.delete(`/api/links/${trashed}`).expect(204);
      await seedLink(t.db.prisma, users.intruder.userId, { url: 'https://youtube.com/6' });

      const body = (await a.get(`${BASE}/${created.id}/matches`).expect(200))
        .body as RuleMatchesResponse;
      expect(body).toEqual({
        total: 2,
        items: [
          { id: newer, tags: [] },
          { id: older, tags: ['fun', 'video'] },
        ],
      });
    });

    it('finds links of an international domain stored in Unicode', async () => {
      const created = await rule({ domain: 'bücher.de', tags: ['books'] });
      const id = await seedLink(t.db.prisma, users.owner.userId, { url: 'https://bücher.de/a' });
      const body = (await a.get(`${BASE}/${created.id}/matches`).expect(200))
        .body as RuleMatchesResponse;
      expect(body.items.map((item) => item.id)).toEqual([id]);
    });
  });
});
