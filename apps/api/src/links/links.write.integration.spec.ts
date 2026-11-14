import { LINK_LIMIT, type LinkResponse } from '@shelfmark/contracts';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { SAFE_FETCH_ERROR_CODE } from '../fetcher/models/safe-fetch-error-code.const';
import { SafeFetchError } from '../fetcher/safe-fetch.error';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';

const BASE = '/api/links';
const REPLAY_ID = '018f0000-0000-7000-8000-0000000000a1';
const PAGE = `<html><head><title>Fetched title</title>
<meta property="og:image" content="https://cdn.test/cover.png">
<link rel="icon" href="https://cdn.test/icon.png"></head></html>`;

describe('links API: writes', () => {
  const fetch = vi.fn<SafeFetcherService['fetch']>();
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetch } }],
    });
  });

  beforeEach(async () => {
    fetch.mockReset();
    fetch.mockResolvedValue({
      finalUrl: 'https://site.test/page',
      status: 200,
      contentType: 'text/html',
      body: PAGE,
    });
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

  const create = async (agent: TestAgent, body: object, status = 201): Promise<LinkResponse> =>
    (await agent.post(BASE).send(body).expect(status)).body as LinkResponse;

  const row = (id: string) => t.db.prisma.link.findUniqueOrThrow({ where: { id } });

  const folderOf = async (user: IsolationUsers['owner'], name = 'F', parentId?: string) =>
    (
      await t.db.prisma.folder.create({
        data: { userId: user.userId, name, parentId: parentId ?? null },
      })
    ).id;

  describe('create', () => {
    it('saves a link with a title without fetching the page', async () => {
      const folderId = await folderOf(users.owner);
      const link = await create(a, {
        url: 'https://site.test/Page/?utm_source=x',
        title: 'My title',
        note: 'why',
        folderId,
        tags: ['To Read', 'ts'],
        faviconUrl: 'https://site.test/icon.png',
        imageUrl: 'https://site.test/img.png',
      });
      expect(link).toMatchObject({
        // "Keep the query part of links" is off by default (#284): tracking parameters go.
        url: 'https://site.test/Page/',
        title: 'My title',
        note: 'why',
        folderId,
        tags: ['To-Read', 'ts'],
        faviconUrl: null,
        imageUrl: null,
        isFavorite: false,
        lastOpenedAt: null,
      });
      expect(fetch).not.toHaveBeenCalled();
      expect(await row(link.id)).toMatchObject({
        userId: users.owner.userId,
        normalizedUrl: 'https://site.test/Page',
        titleSortKey: 'my title',
        faviconSourceUrl: 'https://site.test/icon.png',
        imageSourceUrl: 'https://site.test/img.png',
      });
      expect((await a.get(`${BASE}/${link.id}`).expect(200)).body).toEqual(link);
    });

    it('loads the page for the title and the source URLs only when no title is sent', async () => {
      const link = await create(a, { url: 'https://site.test/page' });
      expect(link.title).toBe('Fetched title');
      expect(link.faviconUrl).toBeNull();
      expect(link.imageUrl).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(await row(link.id)).toMatchObject({
        faviconSourceUrl: 'https://cdn.test/icon.png',
        imageSourceUrl: 'https://cdn.test/cover.png',
      });
    });

    it('prefers the hints of the client over the page', async () => {
      const link = await create(a, {
        url: 'https://site.test/page',
        imageUrl: 'https://mine.test/i.png',
      });
      expect(await row(link.id)).toMatchObject({
        faviconSourceUrl: 'https://cdn.test/icon.png',
        imageSourceUrl: 'https://mine.test/i.png',
      });
    });

    it('uses the URL as title when the page cannot be loaded', async () => {
      fetch.mockRejectedValue(new SafeFetchError(SAFE_FETCH_ERROR_CODE.Timeout, 'slow'));
      const link = await create(a, { url: 'https://down.test/page' });
      expect(link.title).toBe('https://down.test/page');
      expect(await row(link.id)).toMatchObject({
        faviconSourceUrl: null,
        imageSourceUrl: null,
      });
    });

    it('cuts a very long URL title to the title limit', async () => {
      fetch.mockRejectedValue(new Error('down'));
      const url = `https://down.test/${'p'.repeat(LINK_LIMIT.TitleMax + 100)}`;
      const link = await create(a, { url });
      expect(link.title).toHaveLength(LINK_LIMIT.TitleMax);
      expect(link.url).toBe(url);
    });

    it('allows duplicates and treats a blank note as none', async () => {
      const first = await create(a, { url: 'https://site.test/x', title: 't', note: '   ' });
      const second = await create(a, { url: 'https://site.test/x/', title: 't' });
      expect(second.id).not.toBe(first.id);
      expect(first.note).toBeNull();
    });

    it('rejects invalid input', async () => {
      const bad: object[] = [
        {},
        { url: 'javascript:alert(1)' },
        { url: 'data:text/html,x' },
        { url: 'ftp://x.test/' },
        { url: 'https://u:p@site.test/' },
        { url: `https://site.test/${'a'.repeat(LINK_LIMIT.UrlMax)}` },
        { url: 'https://site.test/', title: '   ' },
        { url: 'https://site.test/', title: 't'.repeat(LINK_LIMIT.TitleMax + 1) },
        { url: 'https://site.test/', title: 5 },
        { url: 'https://site.test/', note: 'n'.repeat(LINK_LIMIT.NoteMax + 1) },
        { url: 'https://site.test/', folderId: 'nope' },
        { url: 'https://site.test/', idempotencyKey: 'nope' },
        { url: 'https://site.test/', tags: 'ts' },
        { url: 'https://site.test/', tags: [5] },
        { url: 'https://site.test/', tags: Array.from({ length: 21 }, (_, i) => `t${i}`) },
        { url: 'https://site.test/', tags: ['x'.repeat(51)] },
        { url: 'https://site.test/', faviconUrl: 'javascript:1' },
        { url: 'https://site.test/', imageUrl: 'data:image/png;base64,AA' },
        { url: 'https://site.test/', userId: users.intruder.userId },
        { url: 'https://site.test/', extra: true },
      ];
      for (const body of bad) await a.post(BASE).send(body).expect(400);
      expect(await t.db.prisma.link.count()).toBe(0);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('answers 404 for a foreign or unknown folder and saves nothing', async () => {
      const foreign = await folderOf(users.intruder);
      await a
        .post(BASE)
        .send({ url: 'https://site.test/', title: 't', folderId: foreign })
        .expect(404);
      await a
        .post(BASE)
        .send({
          url: 'https://site.test/',
          title: 't',
          folderId: '018f0000-0000-7000-8000-00000000dead',
        })
        .expect(404);
      expect(await t.db.prisma.link.count()).toBe(0);
      expect(await t.db.prisma.tag.count()).toBe(0);
    });

    it('creates missing tags and reuses existing ones case-insensitively, per user', async () => {
      const theirs = await t.db.prisma.tag.create({
        data: { userId: users.intruder.userId, name: 'shared' },
      });
      const first = await create(a, {
        url: 'https://site.test/1',
        title: 'a',
        tags: ['Shared', 'new'],
      });
      const second = await create(a, { url: 'https://site.test/2', title: 'b', tags: ['SHARED'] });
      expect(first.tags).toEqual(['new', 'Shared']);
      expect(second.tags).toEqual(['Shared']);
      const mine = await t.db.prisma.tag.findMany({ where: { userId: users.owner.userId } });
      expect(mine.map((tag) => tag.name).sort()).toEqual(['Shared', 'new']);
      expect(await t.db.prisma.linkTag.count({ where: { tagId: theirs.id } })).toBe(0);
    });

    it('stops at the per-user cap with 409', async () => {
      const userId = users.owner.userId;
      await t.db.prisma.link.createMany({
        data: Array.from({ length: LINK_LIMIT.PerUserMax }, (_, i) => ({
          userId,
          url: `https://cap.test/${i}`,
          normalizedUrl: `https://cap.test/${i}`,
          title: `t${i}`,
          titleSortKey: `t${i}`,
        })),
      });
      await a.post(BASE).send({ url: 'https://site.test/', title: 't' }).expect(409);
      // Another user is not affected by the cap.
      await b.post(BASE).send({ url: 'https://site.test/', title: 't' }).expect(201);
    }, 60_000);

    it('is rate limited to 30 per minute', async () => {
      for (let i = 0; i < 30; i++) {
        await a
          .post(BASE)
          .send({ url: `https://site.test/${i}`, title: 't' })
          .expect(201);
      }
      await a.post(BASE).send({ url: 'https://site.test/31', title: 't' }).expect(429);
    });
  });

  describe('idempotency', () => {
    it('returns the first link for a repeated key and fetches only once', async () => {
      const first = await create(a, { url: 'https://site.test/page', idempotencyKey: REPLAY_ID });
      const again = await create(
        a,
        { url: 'https://site.test/page', idempotencyKey: REPLAY_ID },
        200,
      );
      expect(again).toEqual(first);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(await t.db.prisma.link.count()).toBe(1);
    });

    it('returns the first link even when the retry changes the body', async () => {
      const first = await create(a, {
        url: 'https://site.test/a',
        title: 'one',
        idempotencyKey: REPLAY_ID,
      });
      const again = await create(
        a,
        { url: 'https://site.test/b', title: 'two', idempotencyKey: REPLAY_ID },
        200,
      );
      expect(again.id).toBe(first.id);
      expect(again.title).toBe('one');
    });

    it('does not let another user replay or learn a key', async () => {
      const mine = await create(a, {
        url: 'https://site.test/a',
        title: 'mine',
        idempotencyKey: REPLAY_ID,
      });
      const theirs = await create(b, {
        url: 'https://site.test/b',
        title: 'theirs',
        idempotencyKey: REPLAY_ID,
      });
      expect(theirs.id).not.toBe(mine.id);
      expect(theirs.title).toBe('theirs');
      expect((await b.get(`${BASE}/${mine.id}`).expect(404)).body).not.toHaveProperty('title');
      expect(await t.db.prisma.link.count()).toBe(2);
    });
  });

  describe('update', () => {
    const seedOne = (options: Parameters<typeof seedLink>[2] = {}, user = users.owner) =>
      seedLink(t.db.prisma, user.userId, options);

    it('changes the fields it is sent and nothing else', async () => {
      const folderId = await folderOf(users.owner);
      const id = await seedOne({
        title: 'Old',
        note: 'n',
        tags: ['keep'],
        url: 'https://a.test/old',
      });
      await t.db.prisma.link.update({
        where: { id },
        data: { faviconSourceUrl: 'https://a.test/f.png', imageSourceUrl: 'https://a.test/i.png' },
      });

      const noop = (await a.patch(`${BASE}/${id}`).send({}).expect(200)).body as LinkResponse;
      expect(noop).toMatchObject({ title: 'Old', note: 'n', tags: ['keep'] });

      const changed = (
        await a
          .patch(`${BASE}/${id}`)
          .send({ title: 'New Title', folderId, isFavorite: true, note: null })
          .expect(200)
      ).body as LinkResponse;
      expect(changed).toMatchObject({
        title: 'New Title',
        folderId,
        isFavorite: true,
        note: null,
        tags: ['keep'],
        url: 'https://a.test/old',
      });
      expect(await row(id)).toMatchObject({
        titleSortKey: 'new title',
        faviconSourceUrl: 'https://a.test/f.png',
      });
      expect(Date.parse(changed.updatedAt)).toBeGreaterThan(Date.parse(noop.updatedAt));

      const unsorted = (await a.patch(`${BASE}/${id}`).send({ folderId: null }).expect(200))
        .body as LinkResponse;
      expect(unsorted.folderId).toBeNull();
    });

    it('recomputes the normalized URL and drops the old hints when the URL changes', async () => {
      const id = await seedOne({ url: 'https://a.test/old' });
      await t.db.prisma.link.update({
        where: { id },
        data: { faviconSourceUrl: 'https://a.test/f.png' },
      });
      await a.patch(`${BASE}/${id}`).send({ url: 'https://B.test/New/?utm_x=1' }).expect(200);
      expect(await row(id)).toMatchObject({
        // Tracking parameters go on update too (#284, default).
        url: 'https://B.test/New/',
        normalizedUrl: 'https://b.test/New',
        faviconSourceUrl: null,
      });
    });

    it('replaces the tags, creating missing ones, and clears them with []', async () => {
      const id = await seedOne({ tags: ['old', 'keep'] });
      const swapped = (
        await a
          .patch(`${BASE}/${id}`)
          .send({ tags: ['KEEP', 'fresh', 'two words'] })
          .expect(200)
      ).body as LinkResponse;
      expect(swapped.tags).toEqual(['fresh', 'keep', 'two-words']);
      const cleared = (await a.patch(`${BASE}/${id}`).send({ tags: [] }).expect(200))
        .body as LinkResponse;
      expect(cleared.tags).toEqual([]);
      // The tags stay as (now empty) tags of the user.
      expect(await t.db.prisma.tag.count({ where: { userId: users.owner.userId } })).toBe(4);
    });

    it('never attaches a tag of another user', async () => {
      const id = await seedOne();
      const theirs = await t.db.prisma.tag.create({
        data: { userId: users.intruder.userId, name: 'shared' },
      });
      const updated = (
        await a
          .patch(`${BASE}/${id}`)
          .send({ tags: ['shared'] })
          .expect(200)
      ).body as LinkResponse;
      expect(updated.tags).toEqual(['shared']);
      expect(await t.db.prisma.linkTag.count({ where: { tagId: theirs.id } })).toBe(0);
    });

    it('rejects invalid input and null for required fields', async () => {
      const id = await seedOne();
      const bad: object[] = [
        { url: 'javascript:alert(1)' },
        { url: null },
        { title: null },
        { title: '  ' },
        { tags: null },
        { tags: [5] },
        { isFavorite: null },
        { isFavorite: 'yes' },
        { folderId: 'nope' },
        { note: 5 },
        { id: '018f0000-0000-7000-8000-00000000dead' },
        { userId: users.intruder.userId },
      ];
      for (const body of bad) await a.patch(`${BASE}/${id}`).send(body).expect(400);
      await a.patch(`${BASE}/not-a-uuid`).send({}).expect(400);
    });

    it('answers 404 for a foreign link, a foreign folder and an unknown link', async () => {
      const id = await seedOne({ title: 'mine' });
      const foreignFolder = await folderOf(users.intruder);
      await b.patch(`${BASE}/${id}`).send({ title: 'hacked' }).expect(404);
      await a.patch(`${BASE}/${id}`).send({ title: 'x', folderId: foreignFolder }).expect(404);
      await a
        .patch(`${BASE}/018f0000-0000-7000-8000-00000000dead`)
        .send({ title: 'x' })
        .expect(404);
      expect(await row(id)).toMatchObject({ title: 'mine', folderId: null });
    });
  });

  describe('history', () => {
    const seedHist = (options: Parameters<typeof seedLink>[2] = {}, user = users.owner) =>
      seedLink(t.db.prisma, user.userId, options);

    it('removes one link from the history, keeps the link and updatedAt, and is idempotent', async () => {
      const id = await seedHist({ title: 'kept', lastOpenedAt: new Date() });
      const other = await seedHist({ title: 'other', lastOpenedAt: new Date() });
      const before = await t.db.prisma.link.findUniqueOrThrow({ where: { id } });
      await a.delete(`${BASE}/recent/${id}`).expect(204);
      await a.delete(`${BASE}/recent/${id}`).expect(204);
      const after = await t.db.prisma.link.findUniqueOrThrow({ where: { id } });
      expect(after.lastOpenedAt).toBeNull();
      expect(after.updatedAt).toEqual(before.updatedAt);
      const recent = (await a.get(`${BASE}/recent`).expect(200)).body as { items: LinkResponse[] };
      expect(recent.items.map((item) => item.id)).toEqual([other]);
      await a.get(`${BASE}/${id}`).expect(200);
    });

    it('answers 404 for a foreign or unknown link and 400 for a malformed id', async () => {
      const id = await seedHist({ title: 'theirs', lastOpenedAt: new Date() }, users.intruder);
      await a.delete(`${BASE}/recent/${id}`).expect(404);
      await a.delete(`${BASE}/recent/018f0000-0000-7000-8000-00000000dead`).expect(404);
      await a.delete(`${BASE}/recent/not-a-uuid`).expect(400);
    });

    it('clears the whole history, keeps the links, and works on an empty history', async () => {
      await a.delete(`${BASE}/recent`).expect(204);
      const one = await seedHist({ title: 'one', lastOpenedAt: new Date() });
      await seedHist({ title: 'two', lastOpenedAt: new Date() });
      await a.delete(`${BASE}/recent`).expect(204);
      const recent = (await a.get(`${BASE}/recent`).expect(200)).body as { items: LinkResponse[] };
      expect(recent.items).toEqual([]);
      await a.get(`${BASE}/${one}`).expect(200);
    });
  });

  describe('open', () => {
    it('records the open without touching updatedAt', async () => {
      const id = await seedLink(t.db.prisma, users.owner.userId, { title: 'o' });
      const before = await row(id);
      const opened = (await a.post(`${BASE}/${id}/open`).expect(200)).body as LinkResponse;
      expect(opened.lastOpenedAt).not.toBeNull();
      expect(opened.updatedAt).toBe(before.updatedAt.toISOString());
      const recent = (await a.get(`${BASE}/recent`).expect(200)).body as { items: LinkResponse[] };
      expect(recent.items.map((item) => item.id)).toEqual([id]);
    });

    it('answers 404 for a foreign or unknown link and records nothing', async () => {
      const id = await seedLink(t.db.prisma, users.owner.userId);
      await b.post(`${BASE}/${id}/open`).expect(404);
      await a.post(`${BASE}/018f0000-0000-7000-8000-00000000dead/open`).expect(404);
      expect((await row(id)).lastOpenedAt).toBeNull();
    });
  });

  describe('delete', () => {
    it('moves an own link to Trash and keeps its tag rows and the tags', async () => {
      const id = await seedLink(t.db.prisma, users.owner.userId, { tags: ['t'] });
      await a.delete(`${BASE}/${id}`).expect(204);
      await a.get(`${BASE}/${id}`).expect(404);
      await a.delete(`${BASE}/${id}`).expect(404);
      const trashed = await t.db.prisma.link.findUniqueOrThrow({ where: { id } });
      expect(trashed.deletedAt).not.toBeNull();
      expect(await t.db.prisma.linkTag.count()).toBe(1);
      expect(await t.db.prisma.tag.count()).toBe(1);
    });

    it('answers 404 for a foreign link and leaves it alone', async () => {
      const id = await seedLink(t.db.prisma, users.owner.userId);
      await b.delete(`${BASE}/${id}`).expect(404);
      expect(await t.db.prisma.link.count({ where: { id } })).toBe(1);
    });
  });
});
