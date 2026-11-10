import type { LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';

const BASE = '/api/links';

describe('links API: data isolation', () => {
  const fetch = vi.fn<SafeFetcherService['fetch']>();
  let t: AuthTestApp;
  let users: IsolationUsers;

  beforeAll(async () => {
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetch } }],
    });
  });

  beforeEach(async () => {
    fetch.mockReset();
    fetch.mockRejectedValue(new Error('offline'));
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  it('links: read, update, remove, list and folder reference are isolated', async () => {
    await expectIsolated(t.app, users, {
      create: async (owner) =>
        (
          (
            await owner
              .post(BASE)
              .send({ url: 'https://owner.test/a', title: 'secret' })
              .expect(201)
          ).body as LinkResponse
        ).id,
      read: (agent, id) => agent.get(`${BASE}/${id}`),
      update: (agent, id) => agent.patch(`${BASE}/${id}`).send({ title: 'hacked' }),
      remove: (agent, id) => agent.delete(`${BASE}/${id}`),
      list: {
        request: (agent) => agent.get(BASE),
        ids: (body) => (body as ListLinksResponse).items.map((item) => item.id),
      },
      reference: (agent, foreignId) =>
        agent.post(BASE).send({ url: 'https://x.test/', title: 't', folderId: foreignId }),
    });
  });

  it('open is a 404 for a foreign link and the owner can still open it', async () => {
    const id = await seedLink(t.db.prisma, users.owner.userId);
    await asUser(t.app, users.intruder).post(`${BASE}/${id}/open`).expect(404);
    await asUser(t.app, users.owner).post(`${BASE}/${id}/open`).expect(200);
  });

  it('recent never lists the links another user opened', async () => {
    const own = await seedLink(t.db.prisma, users.owner.userId, { lastOpenedAt: new Date() });
    const foreign = await seedLink(t.db.prisma, users.intruder.userId, {
      lastOpenedAt: new Date(),
    });
    const items = (
      (await asUser(t.app, users.owner).get(`${BASE}/recent`).expect(200)).body as {
        items: LinkResponse[];
      }
    ).items;
    expect(items.map((item) => item.id)).toEqual([own]);
    expect(items.map((item) => item.id)).not.toContain(foreign);
  });

  it('removing from the history is a 404 for a foreign link and leaves the owner history intact', async () => {
    const id = await seedLink(t.db.prisma, users.owner.userId, { lastOpenedAt: new Date() });
    await asUser(t.app, users.intruder).delete(`${BASE}/recent/${id}`).expect(404);
    const row = await t.db.prisma.link.findUniqueOrThrow({ where: { id } });
    expect(row.lastOpenedAt).not.toBeNull();
    await asUser(t.app, users.owner).delete(`${BASE}/recent/${id}`).expect(204);
    await asUser(t.app, users.owner).delete(`${BASE}/recent/${id}`).expect(204);
    const after = await t.db.prisma.link.findUniqueOrThrow({ where: { id } });
    expect(after.lastOpenedAt).toBeNull();
  });

  it('clearing the history touches only the own links', async () => {
    const own = await seedLink(t.db.prisma, users.owner.userId, { lastOpenedAt: new Date() });
    const foreign = await seedLink(t.db.prisma, users.intruder.userId, {
      lastOpenedAt: new Date(),
    });
    await asUser(t.app, users.intruder).delete(`${BASE}/recent`).expect(204);
    const owner = await t.db.prisma.link.findUniqueOrThrow({ where: { id: own } });
    const intruder = await t.db.prisma.link.findUniqueOrThrow({ where: { id: foreign } });
    expect(owner.lastOpenedAt).not.toBeNull();
    expect(intruder.lastOpenedAt).toBeNull();
    await anonymous(t.app).delete(`${BASE}/recent`).expect(401);
    await anonymous(t.app).delete(`${BASE}/recent/${own}`).expect(401);
  });

  it('every filter and the search stay inside the own links', async () => {
    const ownFolder = await t.db.prisma.folder.create({
      data: { userId: users.owner.userId, name: 'Mine' },
    });
    await seedLink(t.db.prisma, users.intruder.userId, {
      title: 'needle',
      note: 'needle',
      url: 'https://needle.test/',
      isFavorite: true,
      tags: ['needle'],
    });
    await seedLink(t.db.prisma, users.owner.userId, { title: 'plain' });
    const owner = asUser(t.app, users.owner);
    const queries = [
      '?q=needle',
      '?tag=needle',
      '?favorite=true',
      `?folderId=${ownFolder.id}`,
      '?unsorted=true&q=needle',
      '?sort=title&order=asc&q=needle',
    ];
    for (const query of queries) {
      const body = (await owner.get(`${BASE}${query}`).expect(200)).body as ListLinksResponse;
      expect(body.items.map((item) => item.title)).not.toContain('needle');
    }
  });

  it('a duplicate check and an idempotency key never cross users', async () => {
    const key = '018f0000-0000-7000-8000-0000000000b1';
    const intruder = asUser(t.app, users.intruder);
    const owner = asUser(t.app, users.owner);
    const theirs = (
      await intruder
        .post(BASE)
        .send({ url: 'https://dup.test/', title: 'theirs', idempotencyKey: key })
        .expect(201)
    ).body as LinkResponse;
    const mine = (
      await owner
        .post(BASE)
        .send({ url: 'https://dup.test/', title: 'mine', idempotencyKey: key })
        .expect(201)
    ).body as LinkResponse;
    expect(mine.id).not.toBe(theirs.id);
    const preview = (
      await owner.post(`${BASE}/preview`).send({ url: 'https://dup.test/' }).expect(200)
    ).body as { duplicate: { id: string } | null };
    expect(preview.duplicate?.id).toBe(mine.id);
  });

  it('tag names of another user are not reachable through links', async () => {
    await t.db.prisma.tag.create({ data: { userId: users.intruder.userId, name: 'private' } });
    const owner = asUser(t.app, users.owner);
    const link = (
      await owner
        .post(BASE)
        .send({ url: 'https://x.test/', title: 't', tags: ['private'] })
        .expect(201)
    ).body as LinkResponse;
    expect(link.tags).toEqual(['private']);
    const theirTag = await t.db.prisma.tag.findFirstOrThrow({
      where: { userId: users.intruder.userId },
    });
    expect(await t.db.prisma.linkTag.count({ where: { tagId: theirTag.id } })).toBe(0);
  });
});
