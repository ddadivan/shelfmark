import {
  LINK_LIMIT,
  type LinkResponse,
  type ListLinksResponse,
  type LinkSortField,
} from '@shelfmark/contracts';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';
import { hasControlChars } from '../common/validation/has-control-chars';
import { encodeCursor } from './link-cursor';

const BASE = '/api/links';
const NUL = '\u0000';

describe('links API: hardening', () => {
  const fetch = vi.fn<SafeFetcherService['fetch']>();
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;

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
      body: '<html><head><title>T</title></head></html>',
    });
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

  const titles = (page: ListLinksResponse): string[] => page.items.map((item) => item.title);
  const list = async (query: string) =>
    (await a.get(`${BASE}${query}`).expect(200)).body as ListLinksResponse;

  describe('control characters', () => {
    it('rejects NUL and other controls in a create, before any fetch', async () => {
      const url = 'https://site.test/';
      const bad: object[] = [
        { url: `https://site.test/a${NUL}b` },
        { url: 'https://site.test/a\u001fb' },
        { url: 'https://site.test/a\u007fb' },
        { url: 'https://site.test/a\tb' },
        { url: 'https://site.test/a\nb' },
        { url: 'https://site.test/a b\u0001' },
        { url, title: `ti${NUL}tle` },
        { url, title: 'two\nlines' },
        { url, title: 'tab\there' },
        { url, title: 'esc\u001b[0m' },
        { url, title: 't', note: `no${NUL}te` },
        { url, title: 't', note: 'bell\u0007' },
        { url, title: 't', tags: [`ta${NUL}g`] },
        { url, title: 't', tags: ['ok', 'bad\u001bx'] },
        { url, title: 't', faviconUrl: `https://site.test/f${NUL}.png` },
        { url, title: 't', imageUrl: 'https://site.test/i\n.png' },
      ];
      for (const body of bad) await a.post(BASE).send(body).expect(400);
      expect(await t.db.prisma.link.count()).toBe(0);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('keeps tab, newline and carriage return legal in a note', async () => {
      const note = 'line 1\r\nline 2\n\tindented';
      const link = (
        await a.post(BASE).send({ url: 'https://site.test/', title: 't', note }).expect(201)
      ).body as LinkResponse;
      expect(link.note).toBe(note);
    });

    it('rejects NUL and other controls in a PATCH', async () => {
      const id = await seedLink(t.db.prisma, users.owner.userId, { title: 'keep' });
      const bad: object[] = [
        { url: `https://site.test/${NUL}` },
        { title: `x${NUL}` },
        { title: 'a\nb' },
        { note: `x${NUL}` },
        { tags: [`x${NUL}`] },
      ];
      for (const body of bad) await a.patch(`${BASE}/${id}`).send(body).expect(400);
      expect((await t.db.prisma.link.findUniqueOrThrow({ where: { id } })).title).toBe('keep');
    });

    it('rejects controls in the preview URL, q and the tag filter', async () => {
      await a
        .post(`${BASE}/preview`)
        .send({ url: `https://site.test/${NUL}` })
        .expect(400);
      await a.post(`${BASE}/preview`).send({ url: 'https://site.test/a\tb' }).expect(400);
      await a.get(`${BASE}?q=a%00b`).expect(400);
      await a.get(`${BASE}?q=a%01b`).expect(400);
      await a.get(`${BASE}?q=a%7Fb`).expect(400);
      await a.get(`${BASE}?tag=a%00b`).expect(400);
      await a.get(`${BASE}?tag=ok&tag=a%1Fb`).expect(400);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects a cursor whose key holds a control character', async () => {
      await seedLink(t.db.prisma, users.owner.userId, { title: 'one' });
      await seedLink(t.db.prisma, users.owner.userId, { title: 'two' });
      const sorts: LinkSortField[] = ['title'];
      for (const sort of sorts) {
        const cursor = encodeCursor({
          v: 1,
          s: sort,
          o: 'asc',
          k: `a${NUL}b`,
          id: '018f0000-0000-7000-8000-000000000001',
        });
        await a.get(`${BASE}?sort=${sort}&order=asc&cursor=${cursor}`).expect(400);
      }
    });

    it('stores a control-character-free title taken from a page', async () => {
      fetch.mockResolvedValue({
        finalUrl: 'https://site.test/page',
        status: 200,
        contentType: 'text/html',
        body: `<html><head><title>Bad${NUL}title\u001f here</title></head></html>`,
      });
      const link = (await a.post(BASE).send({ url: 'https://site.test/page' }).expect(201))
        .body as LinkResponse;
      expect(hasControlChars(link.title)).toBe(false);
      expect(link.title).toContain('Bad');
    });
  });

  describe('early rejection before the page fetch', () => {
    it('does not fetch for a foreign or unknown folder', async () => {
      const foreign = await t.db.prisma.folder.create({
        data: { userId: users.intruder.userId, name: 'Theirs' },
      });
      await a.post(BASE).send({ url: 'https://site.test/', folderId: foreign.id }).expect(404);
      await a
        .post(BASE)
        .send({ url: 'https://site.test/', folderId: '018f0000-0000-7000-8000-00000000dead' })
        .expect(404);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('does not fetch for a user at the cap', async () => {
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
      await a.post(BASE).send({ url: 'https://site.test/' }).expect(409);
      expect(fetch).not.toHaveBeenCalled();
    }, 60_000);

    it('still fetches for a valid own folder', async () => {
      const own = await t.db.prisma.folder.create({
        data: { userId: users.owner.userId, name: 'Mine' },
      });
      await a.post(BASE).send({ url: 'https://site.test/', folderId: own.id }).expect(201);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('tag names with LIKE wildcards', () => {
    it('the tag filter matches the name literally', async () => {
      await seedLink(t.db.prisma, users.owner.userId, { title: 'underscore', tags: ['a_b'] });
      await seedLink(t.db.prisma, users.owner.userId, { title: 'letter', tags: ['axb'] });
      await seedLink(t.db.prisma, users.owner.userId, { title: 'percent', tags: ['50%'] });
      await seedLink(t.db.prisma, users.owner.userId, { title: 'fifty', tags: ['50off'] });

      expect(titles(await list('?tag=a_b'))).toEqual(['underscore']);
      expect(titles(await list('?tag=axb'))).toEqual(['letter']);
      expect(titles(await list('?tag=50%25'))).toEqual(['percent']);
      expect(titles(await list('?tag=%25'))).toEqual([]);
      expect(titles(await list('?tag=_'))).toEqual([]);
      expect(titles(await list('?tag=A_B'))).toEqual(['underscore']);
    });

    it('creating a link never reuses a tag that only matches as a pattern', async () => {
      const first = (
        await a
          .post(BASE)
          .send({ url: 'https://site.test/1', title: 'a', tags: ['axb'] })
          .expect(201)
      ).body as LinkResponse;
      const second = (
        await a
          .post(BASE)
          .send({ url: 'https://site.test/2', title: 'b', tags: ['a_b'] })
          .expect(201)
      ).body as LinkResponse;
      expect(first.tags).toEqual(['axb']);
      expect(second.tags).toEqual(['a_b']);
      const names = (await t.db.prisma.tag.findMany({ where: { userId: users.owner.userId } }))
        .map((tag) => tag.name)
        .sort();
      expect(names).toEqual(['a_b', 'axb']);
    });
  });
});
