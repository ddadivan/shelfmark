import {
  LINK_LIMIT,
  SAVED_VIEW_ENDPOINT,
  SAVED_VIEW_LIMIT,
  type FolderResponse,
  type ListLinksResponse,
  type ListSavedViewsResponse,
  type SavedViewQueryRequest,
  type SavedViewResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';

const BASE = SAVED_VIEW_ENDPOINT;

describe('saved views API', () => {
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

  const list = async (agent: TestAgent = a): Promise<ListSavedViewsResponse> =>
    (await agent.get(BASE).expect(200)).body as ListSavedViewsResponse;
  const create = async (
    name: string,
    query: SavedViewQueryRequest,
    agent: TestAgent = a,
  ): Promise<SavedViewResponse> =>
    (await agent.post(BASE).send({ name, query }).expect(201)).body as SavedViewResponse;
  const folder = async (name: string, agent: TestAgent = a): Promise<string> =>
    ((await agent.post('/api/folders').send({ name }).expect(201)).body as FolderResponse).id;
  const clear = async (): Promise<void> => {
    await t.db.prisma.savedView.deleteMany({ where: { userId: users.owner.userId } });
  };

  it('a new account starts with the starter views Videos and Articles, counted', async () => {
    const userId = users.owner.userId;
    await seedLink(t.db.prisma, userId, { kind: 'video' });
    await seedLink(t.db.prisma, userId, { kind: 'article' });
    await seedLink(t.db.prisma, userId, { kind: 'article' });
    await seedLink(t.db.prisma, userId);
    const body = await list();
    expect(body.total).toBe(4);
    expect(body.items.map((item) => [item.name, item.position, item.count])).toEqual([
      ['Videos', 0, 1],
      ['Articles', 1, 2],
    ]);
    expect(body.items[0]).toMatchObject({
      available: true,
      query: {
        scope: 'all',
        folderId: null,
        tags: [],
        kind: 'video',
        sort: 'createdAt',
        order: 'desc',
        q: '',
      },
    });
  });

  it('creates, renames, replaces the query and deletes a view', async () => {
    const created = await create('  To read  ', {
      scope: 'favorites',
      tags: ['read later', 'READ-later'],
    });
    expect(created).toMatchObject({
      name: 'To read',
      position: 2,
      count: 0,
      available: true,
      query: { scope: 'favorites', folderId: null, tags: ['read-later'], kind: null, q: '' },
    });
    const renamed = (await a.patch(`${BASE}/${created.id}`).send({ name: 'Later' }).expect(200))
      .body as SavedViewResponse;
    expect(renamed).toMatchObject({ name: 'Later', query: { scope: 'favorites' } });
    const replaced = (
      await a
        .patch(`${BASE}/${created.id}`)
        .send({
          query: { scope: 'all', kind: 'shopping', sort: 'title', order: 'asc', q: ' mug ' },
        })
        .expect(200)
    ).body as SavedViewResponse;
    expect(replaced).toMatchObject({
      name: 'Later',
      query: { scope: 'all', tags: [], kind: 'shopping', sort: 'title', order: 'asc', q: 'mug' },
    });
    await a.delete(`${BASE}/${created.id}`).expect(204);
    await a.delete(`${BASE}/${created.id}`).expect(404);
    await a.patch(`${BASE}/${created.id}`).send({ name: 'x' }).expect(404);
    expect((await list()).items.map((item) => item.name)).toEqual(['Videos', 'Articles']);
  });

  it('counts match the list endpoint for every kind of filter (one grouped query)', async () => {
    const userId = users.owner.userId;
    const work = await folder('Work');
    await seedLink(t.db.prisma, userId, {
      folderId: work,
      kind: 'video',
      title: 'Signals talk',
      tags: ['ng'],
    });
    await seedLink(t.db.prisma, userId, {
      folderId: work,
      title: '100% pure',
      tags: ['ng', 'x_y'],
    });
    await seedLink(t.db.prisma, userId, { isFavorite: true, note: 'signals notes', tags: ['NG'] });
    await seedLink(t.db.prisma, userId, { title: 'Unsorted video', kind: 'video' });
    const queries: SavedViewQueryRequest[] = [
      { scope: 'folder', folderId: work },
      { scope: 'unsorted' },
      { scope: 'favorites' },
      { scope: 'all', tags: ['ng'] },
      { scope: 'all', tags: ['ng', 'x_y'] },
      { scope: 'all', tags: ['xay'] },
      { scope: 'all', q: 'signals' },
      { scope: 'all', q: '100%' },
      { scope: 'all', q: '1%0' },
      { scope: 'unsorted', kind: 'video' },
      { scope: 'folder', folderId: work, kind: 'video', q: 'talk', tags: ['ng'] },
    ];
    await clear();
    for (const [index, query] of queries.entries()) await create(`v${index}`, query);
    const body = await list();
    for (const [index, query] of queries.entries()) {
      const params: Record<string, unknown> = { limit: 100 };
      if (query.scope === 'folder') params['folderId'] = query.folderId;
      if (query.scope === 'unsorted') params['unsorted'] = true;
      if (query.scope === 'favorites') params['favorite'] = true;
      if (query.tags) params['tag'] = query.tags;
      if (query.q) params['q'] = query.q;
      if (query.kind) params['kind'] = query.kind;
      const page = (await a.get('/api/links').query(params).expect(200)).body as ListLinksResponse;
      expect(body.items[index]?.count, JSON.stringify(query)).toBe(
        page.items.length + page.pinned.length,
      );
    }
    expect(body.total).toBe(4);
  });

  it('trashed links are never counted', async () => {
    const id = await seedLink(t.db.prisma, users.owner.userId, { kind: 'video' });
    await a.delete(`/api/links/${id}`).expect(204);
    const body = await list();
    expect(body.total).toBe(0);
    expect(body.items[0]?.count).toBe(0);
  });

  it('a folder view needs an own live folder; a trashed folder makes it unavailable until restored', async () => {
    const work = await folder('Work');
    const foreign = await folder('Theirs', asUser(t.app, users.intruder));
    await seedLink(t.db.prisma, users.owner.userId, { folderId: work });
    await a
      .post(BASE)
      .send({ name: 'F', query: { scope: 'folder', folderId: foreign } })
      .expect(404);
    const view = await create('Work', { scope: 'folder', folderId: work });
    expect(view).toMatchObject({ count: 1, available: true });

    await a.delete(`/api/folders/${work}`).query({ mode: 'delete-links' }).expect(204);
    const trashed = (await list()).items.find((item) => item.id === view.id);
    expect(trashed).toMatchObject({ count: 0, available: false, query: { folderId: work } });
    // A trashed folder cannot be chosen for a view either.
    await a
      .post(BASE)
      .send({ name: 'F', query: { scope: 'folder', folderId: work } })
      .expect(404);
    await a
      .patch(`${BASE}/${view.id}`)
      .send({ query: { scope: 'folder', folderId: work } })
      .expect(404);
    // Renaming the unavailable view still works.
    await a.patch(`${BASE}/${view.id}`).send({ name: 'Old work' }).expect(200);

    await a
      .post('/api/trash/restore')
      .send({ items: [{ kind: 'folder', id: work }] })
      .expect(200);
    expect((await list()).items.find((item) => item.id === view.id)).toMatchObject({
      name: 'Old work',
      count: 1,
      available: true,
    });

    // Gone for good: still listed, unavailable.
    await a.delete(`/api/folders/${work}`).query({ mode: 'delete-links' }).expect(204);
    await a.delete('/api/trash').expect(200);
    expect((await list()).items.find((item) => item.id === view.id)).toMatchObject({
      available: false,
      count: 0,
    });
  });

  it('validates the name and the query strictly', async () => {
    const work = await folder('Work');
    const bad: unknown[] = [
      { name: '', query: { scope: 'all' } },
      { name: '   ', query: { scope: 'all' } },
      { name: 'x'.repeat(SAVED_VIEW_LIMIT.NameMax + 1), query: { scope: 'all' } },
      { name: 'a\u0000b', query: { scope: 'all' } },
      { name: 'x' },
      { name: 'x', query: 'all' },
      { name: 'x', query: { scope: 'everything' } },
      { name: 'x', query: { scope: 'folder' } },
      { name: 'x', query: { scope: 'folder', folderId: 'not-a-uuid' } },
      { name: 'x', query: { scope: 'all', folderId: work } },
      { name: 'x', query: { scope: 'all', tags: ['a', 'b', 'c', 'd', 'e', 'f'] } },
      { name: 'x', query: { scope: 'all', tags: ['x'.repeat(51)] } },
      { name: 'x', query: { scope: 'all', tags: 'a' } },
      { name: 'x', query: { scope: 'all', kind: 'podcast' } },
      { name: 'x', query: { scope: 'all', sort: 'url' } },
      { name: 'x', query: { scope: 'all', order: 'up' } },
      { name: 'x', query: { scope: 'all', q: 'x'.repeat(LINK_LIMIT.QueryMax + 1) } },
      { name: 'x', query: { scope: 'all', q: 'a\u0007' } },
      { name: 'x', query: { scope: 'all', extra: true } },
      { name: 'x', query: { scope: 'all' }, position: 3 },
    ];
    for (const body of bad) {
      const res = await a.post(BASE).send(body as object);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    const view = await create('ok', { scope: 'all', kind: null, folderId: null });
    await a.patch(`${BASE}/${view.id}`).send({ name: null }).expect(400);
    await a.patch(`${BASE}/${view.id}`).send({ query: null }).expect(400);
    await a.patch(`${BASE}/not-a-uuid`).send({ name: 'x' }).expect(400);
    expect((await list()).items).toHaveLength(3);
  });

  it(`keeps at most ${SAVED_VIEW_LIMIT.PerUserMax} views per user`, async () => {
    await clear();
    await t.db.prisma.savedView.createMany({
      data: Array.from({ length: SAVED_VIEW_LIMIT.PerUserMax - 1 }, (_, position) => ({
        userId: users.owner.userId,
        name: `v${position}`,
        query: { scope: 'all' },
        position,
      })),
    });
    const last = await create('last', { scope: 'all' });
    expect(last.position).toBe(SAVED_VIEW_LIMIT.PerUserMax - 1);
    await a
      .post(BASE)
      .send({ name: 'one too many', query: { scope: 'all' } })
      .expect(409);
    // The other user is not affected.
    await create('mine', { scope: 'all' }, asUser(t.app, users.intruder));
  });

  it('reorders with the full set only', async () => {
    const extra = await create('Extra', { scope: 'unsorted' });
    const [videos, articles] = (await list()).items;
    const order = [extra.id, videos?.id ?? '', articles?.id ?? ''];
    const body = (await a.put(`${BASE}/order`).send({ ids: order }).expect(200))
      .body as ListSavedViewsResponse;
    expect(body.items.map((item) => item.id)).toEqual(order);
    expect(body.items.map((item) => item.position)).toEqual([0, 1, 2]);
    await a
      .put(`${BASE}/order`)
      .send({ ids: [extra.id] })
      .expect(400);
    await a
      .put(`${BASE}/order`)
      .send({ ids: [extra.id, extra.id, videos?.id] })
      .expect(400);
    await a
      .put(`${BASE}/order`)
      .send({ ids: ['x'] })
      .expect(400);
    // The new view lands at the end of the new order.
    const next = await create('Next', { scope: 'all' });
    expect(next.position).toBe(3);
    // Upper-case ids are the same views.
    await a
      .put(`${BASE}/order`)
      .send({ ids: [next.id, ...order].map((id) => id.toUpperCase()) })
      .expect(200);
  });

  it('views are isolated between users', async () => {
    await expectIsolated(t.app, users, {
      create: async (owner) =>
        (
          (
            await owner
              .post(BASE)
              .send({ name: 'Mine', query: { scope: 'all' } })
              .expect(201)
          ).body as SavedViewResponse
        ).id,
      // No single-view GET: an empty PATCH answers the view unchanged (200 for the owner, 404 else).
      read: (agent, id) => agent.patch(`${BASE}/${id}`).send({}),
      update: (agent, id) => agent.patch(`${BASE}/${id}`).send({ name: 'Hacked' }),
      remove: (agent, id) => agent.delete(`${BASE}/${id}`),
      list: {
        request: (agent) => agent.get(BASE),
        ids: (body) => (body as ListSavedViewsResponse).items.map((item) => item.id),
      },
      skip: {
        reference:
          'Nothing refers to a view; a foreign id in a reorder is a 400 (checked below), a foreign folder in a view is a 404 (folder test).',
      },
    });
    const foreign = (await list()).items.find((item) => item.name === 'Mine');
    await asUser(t.app, users.intruder)
      .put(`${BASE}/order`)
      .send({ ids: [foreign?.id] })
      .expect(400);
    // The foreign views are untouched and the reorder did not see them.
    expect((await list()).items.map((item) => item.name)).toContain('Mine');
  });

  it('counts only the own links, also for the same tag names', async () => {
    await seedLink(t.db.prisma, users.intruder.userId, { tags: ['shared'], kind: 'video' });
    await create('Shared', { scope: 'all', tags: ['shared'] });
    const body = await list();
    expect(body.total).toBe(0);
    expect(body.items.every((item) => item.count === 0)).toBe(true);
  });

  it('counts inside a feed: folder, Unsorted, Favorites and tags narrow the total and every view (#335)', async () => {
    const userId = users.owner.userId;
    const work = await folder('Work');
    await seedLink(t.db.prisma, userId, { folderId: work, kind: 'video', tags: ['ng'] });
    await seedLink(t.db.prisma, userId, { folderId: work, kind: 'article' });
    await seedLink(t.db.prisma, userId, { kind: 'video', isFavorite: true });
    await seedLink(t.db.prisma, userId, { kind: 'article', tags: ['ng'] });
    const feed = async (query: string): Promise<[number, number[]]> => {
      const body = (await a.get(`${BASE}${query}`).expect(200)).body as ListSavedViewsResponse;
      return [body.total, body.items.map((item) => item.count)];
    };
    expect(await feed('')).toEqual([4, [2, 2]]);
    expect(await feed(`?scope=folder&folderId=${work}`)).toEqual([2, [1, 1]]);
    expect(await feed('?scope=unsorted')).toEqual([2, [1, 1]]);
    expect(await feed('?scope=favorites')).toEqual([1, [1, 0]]);
    expect(await feed('?tag=NG')).toEqual([2, [1, 1]]);
    await a.get(`${BASE}?scope=folder`).expect(400);
    await a.get(`${BASE}?scope=all&folderId=${work}`).expect(400);
    await a.get(`${BASE}?scope=nope`).expect(400);
    await a.get(`${BASE}?unknown=1`).expect(400);
  });

  it('a feed never counts the links of another user, not even in their folder', async () => {
    const theirs = await folder('Theirs', asUser(t.app, users.intruder));
    await seedLink(t.db.prisma, users.intruder.userId, { folderId: theirs, kind: 'video' });
    const body = (await a.get(`${BASE}?scope=folder&folderId=${theirs}`).expect(200))
      .body as ListSavedViewsResponse;
    expect(body.total).toBe(0);
    expect(body.items.every((item) => item.count === 0)).toBe(true);
  });

  it('needs a session, a JSON body and the same origin', async () => {
    await anonymous(t.app).get(BASE).expect(401);
    await anonymous(t.app)
      .post(BASE)
      .send({ name: 'x', query: { scope: 'all' } })
      .expect(401);
    await a
      .post(BASE)
      .set('Origin', 'https://evil.test')
      .send({ name: 'x', query: { scope: 'all' } })
      .expect(403);
    await a.post(BASE).set('Content-Type', 'text/plain').send('{"name":"x"}').expect(415);
    expect((await list()).items).toHaveLength(2);
  });

  it('rate limits the writes', async () => {
    const view = (await list()).items[0];
    let status = 0;
    for (let index = 0; index < 40 && status !== 429; index++) {
      status = (await a.patch(`${BASE}/${view?.id}`).send({ name: `n${index}` })).status;
    }
    expect(status).toBe(429);
  });

  it('deleting the account deletes its views', async () => {
    await create('Mine', { scope: 'all' });
    await t.db.prisma.user.delete({ where: { id: users.owner.userId } });
    expect(await t.db.prisma.savedView.count({ where: { userId: users.owner.userId } })).toBe(0);
  });
});
