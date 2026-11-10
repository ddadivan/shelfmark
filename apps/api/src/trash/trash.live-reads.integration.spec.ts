import {
  type ListFoldersResponse,
  type ListLinksResponse,
  type ListTagsResponse,
  type LinkPreviewResponse,
  type RecentLinksResponse,
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

const LINKS = '/api/links';

/**
 * Every live read and write must ignore Trash (ADR 0036): one live link and one trashed link share
 * the same title word, tag, folder, URL and favorite flag, and each route must only see the live one.
 */
describe('Trash is invisible to live reads and writes', () => {
  const fetch = vi.fn<SafeFetcherService['fetch']>();
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let live: string;
  let gone: string;
  let folderId: string;
  let trashedFolderId: string;

  beforeAll(async () => {
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetch } }],
    });
  });

  beforeEach(async () => {
    fetch.mockReset();
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    const userId = users.owner.userId;
    folderId = (await t.db.prisma.folder.create({ data: { userId, name: 'Shared' } })).id;
    trashedFolderId = (await t.db.prisma.folder.create({ data: { userId, name: 'Binned' } })).id;
    const opened = new Date();
    live = await seedLink(t.db.prisma, userId, {
      title: 'zebra live',
      url: 'https://dup.test/page',
      folderId,
      tags: ['animals'],
      isFavorite: true,
      lastOpenedAt: opened,
    });
    gone = await seedLink(t.db.prisma, userId, {
      title: 'zebra gone',
      url: 'https://dup.test/page',
      folderId,
      tags: ['animals', 'onlytrash'],
      isFavorite: true,
      lastOpenedAt: opened,
    });
    await a.delete(`${LINKS}/${gone}`).expect(204);
    await t.db.prisma.folder.update({
      where: { id: trashedFolderId },
      data: { deletedAt: new Date() },
    });
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const ids = async (query: string): Promise<string[]> =>
    ((await a.get(`${LINKS}${query}`).expect(200)).body as ListLinksResponse).items.map(
      (item) => item.id,
    );

  it.each([
    ['all', ''],
    ['search', '?q=zebra'],
    ['by url words', '?q=dup.test'],
    ['folder', '?folderId=FOLDER'],
    ['favorites', '?favorite=true'],
    ['tag', '?tag=animals'],
    ['title sort', '?sort=title&order=asc'],
  ])('the link list (%s) shows only the live link', async (_label, query) => {
    expect(await ids(query.replace('FOLDER', folderId))).toEqual([live]);
  });

  it('paginates with a cursor over live links only', async () => {
    const extra = await seedLink(t.db.prisma, users.owner.userId, { title: 'zebra extra' });
    const first = (await a.get(`${LINKS}?limit=1`).expect(200)).body as ListLinksResponse;
    const second = (await a.get(`${LINKS}?limit=1&cursor=${first.nextCursor}`).expect(200))
      .body as ListLinksResponse;
    expect([...first.items, ...second.items].map((item) => item.id).sort()).toEqual(
      [live, extra].sort(),
    );
    expect(second.nextCursor).toBeNull();
  });

  it('recent history skips trashed links, and clearing it still resets them', async () => {
    const recent = (await a.get(`${LINKS}/recent`).expect(200)).body as RecentLinksResponse;
    expect(recent.items.map((item) => item.id)).toEqual([live]);
    await a.delete(`${LINKS}/recent`).expect(204);
    const row = await t.db.prisma.link.findUniqueOrThrow({ where: { id: gone } });
    expect(row.lastOpenedAt).toBeNull();
  });

  it('get, update, open, remove-from-history and delete answer 404 for a trashed link', async () => {
    await a.get(`${LINKS}/${gone}`).expect(404);
    await a
      .patch(`${LINKS}/${gone}`)
      .send({ title: 'x', tags: ['y'] })
      .expect(404);
    await a.patch(`${LINKS}/${gone}`).send({ isFavorite: false }).expect(404);
    await a.post(`${LINKS}/${gone}/open`).expect(404);
    await a.delete(`${LINKS}/recent/${gone}`).expect(404);
    await a.delete(`${LINKS}/${gone}`).expect(404);
    await a.post(`${LINKS}/${gone}/images/capture`).expect(404);
    const row = await t.db.prisma.link.findUniqueOrThrow({ where: { id: gone } });
    expect(row.title).toBe('zebra gone');
    expect(row.deletedAt).not.toBeNull();
    await a.get(`${LINKS}/${live}`).expect(200);
  });

  it('folder list and library counts ignore trashed folders and links', async () => {
    await seedLink(t.db.prisma, users.owner.userId, { title: 'unsorted live' });
    const unsortedGone = await seedLink(t.db.prisma, users.owner.userId, {
      title: 'unsorted gone',
    });
    await a.delete(`${LINKS}/${unsortedGone}`).expect(204);
    const res = (await a.get('/api/folders').expect(200)).body as ListFoldersResponse;
    expect(res.items.map((f) => f.id)).toEqual([folderId]);
    expect(res.items[0]?.linkCount).toBe(1);
    expect(res.counts).toEqual({ all: 2, unsorted: 1, favorites: 1 });
  });

  it('a trashed folder is not found or usable', async () => {
    await a.get(`/api/folders/${trashedFolderId}`).expect(404);
    await a.patch(`/api/folders/${trashedFolderId}`).send({ name: 'x' }).expect(404);
    await a.get(`/api/export?format=json&folderId=${trashedFolderId}`).expect(404);
  });

  it('tag counts count live links only, and a tag only on trash has 0', async () => {
    const tags = (await a.get('/api/tags').expect(200)).body as ListTagsResponse;
    const count = (name: string) => tags.items.find((tag) => tag.name === name)?.linkCount;
    expect(count('animals')).toBe(1);
    expect(count('onlytrash')).toBe(0);
  });

  it('merging a tag moves it on the trashed links too', async () => {
    const tags = (await a.get('/api/tags').expect(200)).body as ListTagsResponse;
    const source = tags.items.find((tag) => tag.name === 'onlytrash');
    const dest = (await a.post('/api/tags').send({ name: 'dest' }).expect(201)).body as {
      id: string;
    };
    await a.post(`/api/tags/${source?.id}/merge`).send({ targetTagId: dest.id }).expect(200);
    const row = await t.db.prisma.link.findUniqueOrThrow({
      where: { id: gone },
      include: { tags: { include: { tag: true } } },
    });
    expect(row.tags.map((entry) => entry.tag.name).sort()).toEqual(['animals', 'dest']);
  });

  it('export leaves out trashed links and folders', async () => {
    const json = (await a.get('/api/export?format=json').expect(200)).body as {
      folders: { path: string[] }[];
      links: { title: string }[];
    };
    expect(json.links.map((link) => link.title)).toEqual(['zebra live']);
    expect(json.folders.map((folder) => folder.path.join('/'))).toEqual(['Shared']);
    const html = (await a.get('/api/export?format=html').expect(200)).text;
    expect(html).toContain('zebra live');
    expect(html).not.toContain('zebra gone');
    expect(html).not.toContain('Binned');
    const filtered = (await a.get('/api/export?format=json&q=zebra').expect(200)).body as {
      links: unknown[];
    };
    expect(filtered.links).toHaveLength(1);
  });

  it('the duplicate check ignores trashed links', async () => {
    fetch.mockResolvedValue({
      finalUrl: 'https://only-trash.test/',
      status: 200,
      contentType: 'text/html',
      body: '<html><head><title>T</title></head></html>',
    });
    await a.delete(`${LINKS}/${live}`).expect(204);
    const res = (
      await a.post(`${LINKS}/preview`).send({ url: 'https://dup.test/page' }).expect(200)
    ).body as LinkPreviewResponse;
    expect(res.duplicate).toBeNull();
  });

  it('the duplicate check still finds the live link', async () => {
    fetch.mockResolvedValue({
      finalUrl: 'https://dup.test/page',
      status: 200,
      contentType: 'text/html',
      body: '<html><head><title>T</title></head></html>',
    });
    const res = (
      await a.post(`${LINKS}/preview`).send({ url: 'https://dup.test/page' }).expect(200)
    ).body as LinkPreviewResponse;
    expect(res.duplicate?.id).toBe(live);
  });

  it('create with an idempotency key of a trashed link still replays it', async () => {
    const key = '018f0000-0000-7000-8000-0000000000aa';
    const first = await a
      .post(LINKS)
      .send({ url: 'https://k.test/', title: 'k', idempotencyKey: key })
      .expect(201);
    await a.delete(`${LINKS}/${(first.body as { id: string }).id}`).expect(204);
    const again = await a
      .post(LINKS)
      .send({ url: 'https://k.test/', title: 'k', idempotencyKey: key })
      .expect(200);
    expect((again.body as { id: string }).id).toBe((first.body as { id: string }).id);
  });
});
