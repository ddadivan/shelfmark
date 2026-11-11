import { randomUUID } from 'node:crypto';
import {
  DEMO_LIMIT,
  LINK_BATCH_ERROR_CODE,
  LINK_ERROR_MESSAGE,
  LINK_IMAGE_PENDING_VERSION,
  LINK_IMAGES_ENDPOINT,
  LINK_LIMIT,
  LINKS_BATCH_ENDPOINT,
  linkLimitMessage,
  type CreateLinksBatchItem,
  type CreateLinksBatchResponse,
  type DeleteLinksBatchResponse,
  type LinkResponse,
  type ListLinksResponse,
} from '@shelfmark/contracts';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { signInDemo } from '../../test-utils/sign-in-demo';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';

const CREATE = LINKS_BATCH_ENDPOINT.Create;
const DELETE = LINKS_BATCH_ENDPOINT.Delete;
const PAGE_HTML = '<html><head><title>  The page   title </title></head></html>';
const captureUrl = (id: string): string => LINK_IMAGES_ENDPOINT.Capture.replace(':id', id);

const item = (url: string, extra: Partial<CreateLinksBatchItem> = {}): CreateLinksBatchItem => ({
  url,
  idempotencyKey: randomUUID(),
  ...extra,
});

describe('links API: batch create and delete (#265)', () => {
  const fetch = vi.fn<SafeFetcherService['fetch']>();
  const fetchImage = vi.fn<SafeFetcherService['fetchImage']>();
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetch, fetchImage } }],
    });
  });

  beforeEach(async () => {
    fetch.mockReset();
    fetch.mockImplementation(async (url) => ({
      finalUrl: url,
      status: 200,
      contentType: 'text/html',
      body: PAGE_HTML,
    }));
    fetchImage.mockReset();
    fetchImage.mockRejectedValue(new Error('no images in this test'));
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

  const batch = async (
    agent: TestAgent,
    body: object,
    status = 201,
  ): Promise<CreateLinksBatchResponse> =>
    (await agent.post(CREATE).send(body).expect(status)).body as CreateLinksBatchResponse;

  const folderOf = async (user: IsolationUsers['owner'], name = 'Angular') =>
    (await t.db.prisma.folder.create({ data: { userId: user.userId, name } })).id;

  const countOf = (user: IsolationUsers['owner']) =>
    t.db.prisma.link.count({ where: { userId: user.userId } });

  describe('create', () => {
    it('saves every item in one request, with folder and tags for all, without fetching', async () => {
      const folderId = await folderOf(users.owner);
      const body = await batch(a, {
        items: [
          item('https://youtube.com/watch?v=signals', { title: 'Signals deep dive' }),
          item('https://angular.dev/guide/forms/signals', {
            title: 'Signal Forms guide',
            faviconUrl: 'https://angular.dev/favicon.ico',
            imageUrl: 'https://angular.dev/og.png',
          }),
          item('https://dev.to/ngrx/signalstore-testing'),
        ],
        folderId,
        tags: ['Angular', 'to read'],
      });

      expect(body.errors).toEqual([]);
      expect(body.links.map((link) => link.title)).toEqual([
        'Signals deep dive',
        'Signal Forms guide',
        // No title yet: the URL until the lazy capture loads the page.
        'https://dev.to/ngrx/signalstore-testing',
      ]);
      for (const link of body.links) {
        expect(link).toMatchObject({ folderId, tags: ['Angular', 'to-read'] });
        // Pending: the web asks the capture endpoint for images (and the missing title).
        expect(link.imageUrl).toMatch(new RegExp(`\\?v=${LINK_IMAGE_PENDING_VERSION}$`));
        expect(link.faviconUrl).toMatch(new RegExp(`\\?v=${LINK_IMAGE_PENDING_VERSION}$`));
      }
      expect(fetch).not.toHaveBeenCalled();
      expect(fetchImage).not.toHaveBeenCalled();
      const hints = await t.db.prisma.link.findFirstOrThrow({
        where: { id: body.links[1].id },
        select: { faviconSourceUrl: true, imageSourceUrl: true, captureAttemptedAt: true },
      });
      expect(hints).toEqual({
        faviconSourceUrl: 'https://angular.dev/favicon.ico',
        imageSourceUrl: 'https://angular.dev/og.png',
        captureAttemptedAt: null,
      });
    });

    it('lists the links in paste order in the newest-first feed', async () => {
      await seedLink(t.db.prisma, users.owner.userId, { title: 'older' });
      const body = await batch(a, {
        items: [item('https://a.test/1'), item('https://a.test/2'), item('https://a.test/3')],
      });
      const feed = (await a.get('/api/links').expect(200)).body as ListLinksResponse;
      expect(feed.items.map((link) => link.id).slice(0, 3)).toEqual(
        body.links.map((link) => link.id),
      );
      expect(feed.items[3].title).toBe('older');
    });

    it('saves into Unsorted without a folder and accepts exactly 100 items', async () => {
      const items = Array.from({ length: LINK_LIMIT.BatchMax }, (_, i) =>
        item(`https://many.test/${i}`),
      );
      const body = await batch(a, { items });
      expect(body.links).toHaveLength(LINK_LIMIT.BatchMax);
      expect(body.links.every((link) => link.folderId === null && link.tags.length === 0)).toBe(
        true,
      );
    });

    it('skips a URL repeated within the batch and an over-long normalized URL, saves the rest', async () => {
      // Every "ä" becomes "%C3%A4" when normalized: short enough raw, too long normalized.
      const long = `https://long.test/${'ä'.repeat(700)}`;
      const body = await batch(a, {
        items: [
          item('https://dup.test/page'),
          item('https://DUP.test/page/?utm_source=x'),
          item(long),
          item('https://ok.test/'),
        ],
      });
      expect(body.links.map((link) => link.url)).toEqual([
        'https://dup.test/page',
        'https://ok.test/',
      ]);
      expect(body.errors).toEqual([
        {
          index: 1,
          url: 'https://DUP.test/page/?utm_source=x',
          code: LINK_BATCH_ERROR_CODE.DuplicateInBatch,
        },
        { index: 2, url: long, code: LINK_BATCH_ERROR_CODE.UrlTooLong },
      ]);
    });

    it('answers 200 with only errors when no item can be saved', async () => {
      const long = `https://long.test/${'ä'.repeat(700)}`;
      const body = await batch(a, { items: [item(long)] }, 200);
      expect(body.links).toEqual([]);
      expect(body.errors).toHaveLength(1);
      expect(await countOf(users.owner)).toBe(0);
    });

    it('allows URLs that are already saved (save anyway)', async () => {
      await seedLink(t.db.prisma, users.owner.userId, { url: 'https://saved.test/' });
      const body = await batch(a, { items: [item('https://saved.test/')] });
      expect(body.links).toHaveLength(1);
      expect(await countOf(users.owner)).toBe(2);
    });

    it.each([
      ['no items', { items: [] }],
      [
        'more than 100 items',
        { items: Array.from({ length: 101 }, (_, i) => item(`https://x.test/${i}`)) },
      ],
      ['items is not an array', { items: 'https://x.test/' }],
      ['a javascript: URL', { items: [item('javascript:alert(1)')] }],
      ['a data: URL', { items: [item('data:text/html,hi')] }],
      ['a URL with credentials', { items: [item('https://user:pw@x.test/')] }],
      ['a missing key', { items: [{ url: 'https://x.test/' }] }],
      ['a key that is not a UUID', { items: [{ url: 'https://x.test/', idempotencyKey: 'k' }] }],
      ['an unknown item field', { items: [{ ...item('https://x.test/'), note: 'x' }] }],
      ['an unknown top-level field', { items: [item('https://x.test/')], note: 'x' }],
      [
        'a title with a control character',
        { items: [item('https://x.test/', { title: 'a\u0000b' })] },
      ],
      ['an empty title', { items: [item('https://x.test/', { title: '   ' })] }],
      ['an over-long title', { items: [item('https://x.test/', { title: 'x'.repeat(301) })] }],
      ['a folder that is not a UUID', { items: [item('https://x.test/')], folderId: 'f' }],
      [
        'too many tags',
        { items: [item('https://x.test/')], tags: Array.from({ length: 21 }, (_, i) => `t${i}`) },
      ],
      ['an over-long tag', { items: [item('https://x.test/')], tags: ['x'.repeat(51)] }],
    ])('rejects %s with 400 and saves nothing', async (_name, body) => {
      await a.post(CREATE).send(body).expect(400);
      expect(await countOf(users.owner)).toBe(0);
    });

    it('rejects one key used for two items', async () => {
      const key = randomUUID();
      const res = await a
        .post(CREATE)
        .send({
          items: [
            item('https://x.test/1', { idempotencyKey: key }),
            item('https://x.test/2', { idempotencyKey: key.toUpperCase() }),
          ],
        })
        .expect(400);
      expect(res.body.message).toBe(LINK_ERROR_MESSAGE.DuplicateIdempotencyKey);
    });

    it('needs a session', async () => {
      await anonymous(t.app)
        .post(CREATE)
        .send({ items: [item('https://x.test/')] })
        .expect(401);
    });

    it('answers 404 for a missing folder and saves nothing', async () => {
      await a
        .post(CREATE)
        .send({ items: [item('https://x.test/')], folderId: randomUUID() })
        .expect(404);
      expect(await countOf(users.owner)).toBe(0);
    });

    it('enforces the per-user cap for the whole batch and says how many fit', async () => {
      const userId = users.owner.userId;
      await t.db.prisma.link.createMany({
        data: Array.from({ length: LINK_LIMIT.PerUserMax - 2 }, (_, i) => ({
          userId,
          url: `https://cap.test/${i}`,
          normalizedUrl: `https://cap.test/${i}`,
          title: `t${i}`,
          titleSortKey: `t${i}`,
        })),
      });
      const res = await a
        .post(CREATE)
        .send({
          items: [item('https://n.test/1'), item('https://n.test/2'), item('https://n.test/3')],
        })
        .expect(409);
      expect(res.body.message).toBe(linkLimitMessage(2));
      expect(await countOf(users.owner)).toBe(LINK_LIMIT.PerUserMax - 2);
      // Two still fit.
      await batch(a, { items: [item('https://n.test/1'), item('https://n.test/2')] });
      // Another user is not affected by the cap.
      await batch(b, { items: [item('https://n.test/1')] });
    }, 60_000);

    it('applies the lower demo cap to a demo session', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const agent = asUser(t.app, demo);
      const have = await t.db.prisma.link.count({ where: { userId: demo.userId } });
      const items = Array.from({ length: DEMO_LIMIT.MaxLinks - have + 1 }, (_, i) =>
        item(`https://demo.test/${i}`),
      );
      const res = await agent.post(CREATE).send({ items }).expect(409);
      expect(res.body.message).toBe(linkLimitMessage(DEMO_LIMIT.MaxLinks - have));
      await agent
        .post(CREATE)
        .send({ items: items.slice(1) })
        .expect(201);
    });

    it('is rate limited to 5 batches a minute', async () => {
      for (let i = 0; i < 5; i++) {
        await batch(a, { items: [item(`https://rate.test/${i}`)] });
      }
      const res = await a
        .post(CREATE)
        .send({ items: [item('https://rate.test/6')] })
        .expect(429);
      expect(res.headers['retry-after']).toBeDefined();
    });
  });

  describe('idempotency', () => {
    it('replays a retried batch with 200 and the same links', async () => {
      const items = [item('https://idem.test/1'), item('https://idem.test/2')];
      const first = await batch(a, { items });
      const again = await batch(a, { items }, 200);
      expect(again.links.map((link) => link.id)).toEqual(first.links.map((link) => link.id));
      expect(await countOf(users.owner)).toBe(2);
    });

    it('creates only the new items of a partly replayed batch', async () => {
      const known = item('https://idem.test/known', { title: 'Known' });
      const first = await batch(a, { items: [known] });
      const fresh = item('https://idem.test/fresh');
      // The payload of a replayed key is ignored, like ADR 0033.
      const second = await batch(a, {
        items: [{ ...known, title: 'Changed' }, fresh],
      });
      expect(second.links[0]).toMatchObject({ id: first.links[0].id, title: 'Known' });
      expect(second.links[1].url).toBe('https://idem.test/fresh');
      expect(await countOf(users.owner)).toBe(2);
    });

    it('serializes two parallel copies of one batch: one set of links', async () => {
      const items = [item('https://par.test/1'), item('https://par.test/2')];
      const [x, y] = await Promise.all([
        a.post(CREATE).send({ items }),
        a.post(CREATE).send({ items }),
      ]);
      expect([x.status, y.status].sort()).toEqual([200, 201]);
      expect(await countOf(users.owner)).toBe(2);
    });

    it('a key of another user never replays across users', async () => {
      const items = [item('https://cross.test/')];
      const mine = await batch(a, { items });
      const theirs = await batch(b, { items });
      expect(theirs.links[0].id).not.toBe(mine.links[0].id);
      expect(await countOf(users.intruder)).toBe(1);
    });
  });

  describe('lazy title and images after a batch', () => {
    it('the capture fills in the page title of a link saved without one', async () => {
      const [link] = (await batch(a, { items: [item('https://lazy.test/page')] })).links;
      const after = (await a.post(captureUrl(link.id)).expect(200)).body as LinkResponse;
      expect(after.title).toBe('The page title');
      expect(after.updatedAt).toBe(link.updatedAt);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('keeps a title that was sent or typed meanwhile', async () => {
      const [titled, untitled] = (
        await batch(a, {
          items: [
            item('https://lazy.test/titled', { title: 'Mine' }),
            item('https://lazy.test/untitled'),
          ],
        })
      ).links;
      await a.patch(`/api/links/${untitled.id}`).send({ title: 'Typed' }).expect(200);
      for (const link of [titled, untitled]) {
        await a.post(captureUrl(link.id)).expect(200);
      }
      const titles = await t.db.prisma.link.findMany({
        where: { id: { in: [titled.id, untitled.id] } },
        select: { title: true },
        orderBy: { title: 'asc' },
      });
      expect(titles.map((row) => row.title)).toEqual(['Mine', 'Typed']);
    });

    it('keeps the URL as the title when the page has none', async () => {
      fetch.mockResolvedValue({
        finalUrl: 'https://lazy.test/bare',
        status: 200,
        contentType: 'text/html',
        body: '<html><head></head></html>',
      });
      const [link] = (await batch(a, { items: [item('https://lazy.test/bare')] })).links;
      const after = (await a.post(captureUrl(link.id)).expect(200)).body as LinkResponse;
      expect(after.title).toBe('https://lazy.test/bare');
    });
  });

  describe('batch delete', () => {
    it('moves the given own links to Trash (the Undo of a paste) and ignores missing ids', async () => {
      const { links } = await batch(a, {
        items: [item('https://del.test/1'), item('https://del.test/2'), item('https://del.test/3')],
      });
      const res = await a
        .post(DELETE)
        .send({ ids: [links[0].id, links[1].id, randomUUID()] })
        .expect(200);
      expect(res.body as DeleteLinksBatchResponse).toEqual({ deleted: 2 });
      const live = await t.db.prisma.link.findMany({
        where: { userId: users.owner.userId, deletedAt: null },
      });
      expect(live.map((row) => row.id)).toEqual([links[2].id]);
      // Soft delete (#267, ADR 0036): the two links wait in Trash with one shared timestamp.
      const trashed = await t.db.prisma.link.findMany({
        where: { userId: users.owner.userId, deletedAt: { not: null } },
      });
      expect(trashed.map((row) => row.id).sort()).toEqual([links[0].id, links[1].id].sort());
      expect(new Set(trashed.map((row) => row.deletedAt?.toISOString())).size).toBe(1);
    });

    it.each([
      ['no ids', { ids: [] }],
      ['a non-UUID id', { ids: ['x'] }],
      [
        'the same id twice',
        { ids: ['018f0000-0000-7000-8000-000000000001', '018f0000-0000-7000-8000-000000000001'] },
      ],
      ['more than 100 ids', { ids: Array.from({ length: 101 }, () => randomUUID()) }],
      ['an unknown field', { ids: [randomUUID()], all: true }],
    ])('rejects %s with 400', async (_name, body) => {
      await a.post(DELETE).send(body).expect(400);
    });

    it('is rate limited to 10 a minute', async () => {
      for (let i = 0; i < 10; i++) {
        await a
          .post(DELETE)
          .send({ ids: [randomUUID()] })
          .expect(200);
      }
      await a
        .post(DELETE)
        .send({ ids: [randomUUID()] })
        .expect(429);
    });
  });

  describe('data isolation', () => {
    it('links saved by a batch are isolated like any link', async () => {
      await expectIsolated(t.app, users, {
        create: async (agent) =>
          (
            (
              await agent
                .post(CREATE)
                .send({ items: [item('https://iso.test/')] })
                .expect(201)
            ).body as CreateLinksBatchResponse
          ).links[0].id,
        read: (agent, id) => agent.get(`/api/links/${id}`),
        update: (agent, id) => agent.patch(`/api/links/${id}`).send({ title: 'x' }),
        remove: (agent, id) => agent.delete(`/api/links/${id}`),
        list: {
          request: (agent) => agent.get('/api/links'),
          ids: (body) => (body as ListLinksResponse).items.map((link) => link.id),
        },
        skip: { reference: 'a link id is never referenced by a batch create' },
      });
    });

    it("a batch into another user's folder is a 404 and saves nothing", async () => {
      const theirs = await folderOf(users.owner);
      await b
        .post(CREATE)
        .send({ items: [item('https://iso.test/')], folderId: theirs })
        .expect(404);
      expect(await countOf(users.intruder)).toBe(0);
    });

    it("a batch delete never removes another user's links", async () => {
      const { links } = await batch(a, { items: [item('https://iso.test/1')] });
      const res = await b
        .post(DELETE)
        .send({ ids: links.map((link) => link.id) })
        .expect(200);
      expect(res.body).toEqual({ deleted: 0 });
      expect(await countOf(users.owner)).toBe(1);
    });

    it("tags for all reuse the user's own tags, never another user's", async () => {
      const theirs = await t.db.prisma.tag.create({
        data: { userId: users.owner.userId, name: 'shared' },
      });
      const body = await batch(b, { items: [item('https://iso.test/')], tags: ['Shared'] });
      expect(body.links[0].tags).toEqual(['Shared']);
      expect(await t.db.prisma.linkTag.count({ where: { tagId: theirs.id } })).toBe(0);
    });
  });
});
