import {
  FOLDER_DELETE_MODE,
  FOLDER_LIMIT,
  type FolderResponse,
  type ListFoldersResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';

const BASE = '/api/folders';

async function createFolder(agent: TestAgent, name: string, parentId?: string): Promise<string> {
  const res = await agent.post(BASE).send({ name, parentId }).expect(201);
  return (res.body as FolderResponse).id;
}

describe('folders API', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
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

  async function addLink(
    userId: string,
    data: { folderId?: string | null; isFavorite?: boolean },
  ): Promise<string> {
    const n = Math.random().toString(36).slice(2);
    const link = await t.db.prisma.link.create({
      data: {
        userId,
        url: `https://example.com/${n}`,
        normalizedUrl: `https://example.com/${n}`,
        title: n,
        titleSortKey: n,
        folderId: data.folderId ?? null,
        isFavorite: data.isFavorite ?? false,
      },
    });
    return link.id;
  }

  const list = async (agent: TestAgent): Promise<ListFoldersResponse> =>
    (await agent.get(BASE).expect(200)).body as ListFoldersResponse;

  it('data isolation', async () => {
    await expectIsolated(t.app, users, {
      create: (owner) => createFolder(owner, 'Mine'),
      read: (u, id) => u.get(`${BASE}/${id}`),
      update: (u, id) => u.patch(`${BASE}/${id}`).send({ name: 'Hacked' }),
      remove: (u, id) => u.delete(`${BASE}/${id}?mode=${FOLDER_DELETE_MODE.DeleteLinks}`),
      list: {
        request: (u) => u.get(BASE),
        ids: (body) => (body as ListFoldersResponse).items.map((f) => f.id),
      },
      reference: (u, id) => u.post(BASE).send({ name: 'Child', parentId: id }),
    });
  });

  it('reads one folder with its direct link count', async () => {
    const id = await createFolder(a, 'Counted');
    await addLink(users.owner.userId, { folderId: id });
    await addLink(users.owner.userId, { folderId: id });
    const res = await a.get(`${BASE}/${id}`).expect(200);
    expect(res.body).toMatchObject({ id, name: 'Counted', parentId: null, linkCount: 2 });
  });

  it('moves into a foreign parent are 404 and leave the folder alone', async () => {
    const foreign = await createFolder(a, 'Foreign');
    const mine = await createFolder(b, 'Mine');
    await b.patch(`${BASE}/${mine}`).send({ parentId: foreign }).expect(404);
    expect((await list(b)).items[0].parentId).toBeNull();
  });

  it('lists only own folders by position, then name, with direct counts and library counts', async () => {
    const zed = await createFolder(a, 'Zed');
    const alpha = await createFolder(a, 'Alpha');
    const inner = await createFolder(a, 'Inner', alpha);
    await addLink(users.owner.userId, { folderId: alpha });
    await addLink(users.owner.userId, { folderId: inner, isFavorite: true });
    await addLink(users.owner.userId, { folderId: inner });
    await addLink(users.owner.userId, {});
    await createFolder(b, 'Other');
    await addLink(users.intruder.userId, { isFavorite: true });
    await addLink(users.intruder.userId, {});

    const body = await list(a);
    // A new folder goes to the end of its parent (#314): Zed 0, Alpha 1; Inner is 0 under Alpha.
    expect(body.items.map((f) => [f.name, f.position])).toEqual([
      ['Inner', 0],
      ['Zed', 0],
      ['Alpha', 1],
    ]);
    const count = (id: string): number => body.items.find((f) => f.id === id)?.linkCount ?? -1;
    expect(count(alpha)).toBe(1);
    expect(count(inner)).toBe(2);
    expect(count(zed)).toBe(0);
    expect(body.counts).toEqual({ all: 4, unsorted: 1, favorites: 1 });
    expect((await list(b)).counts).toEqual({ all: 2, unsorted: 2, favorites: 1 });
  });

  it('creates nested folders, trims names and rejects bad input', async () => {
    const parent = await createFolder(a, '  Parent  ');
    const res = await a.post(BASE).send({ name: 'Kid', parentId: parent }).expect(201);
    expect(res.body).toMatchObject({ name: 'Kid', parentId: parent, linkCount: 0 });
    expect((await list(a)).items.map((f) => f.name)).toContain('Parent');

    for (const body of [
      { name: '   ' },
      { name: 'x'.repeat(FOLDER_LIMIT.NameMax + 1) },
      { name: 'ok', parentId: 'not-a-uuid' },
      { name: 'ok', extra: 1 },
      {},
    ]) {
      const bad = await a.post(BASE).send(body).expect(400);
      expect(Object.keys(bad.body as object).sort()).toEqual([
        'error',
        'message',
        'requestId',
        'statusCode',
      ]);
    }
    await a.get(`${BASE}/not-a-uuid`).expect(400);
  });

  it('answers 409 at the per-user cap', async () => {
    await t.db.prisma.folder.createMany({
      data: Array.from({ length: FOLDER_LIMIT.PerUserMax }, (_, i) => ({
        userId: users.owner.userId,
        name: `f${i}`,
      })),
    });
    await a.post(BASE).send({ name: 'one too many' }).expect(409);
    await b.post(BASE).send({ name: 'other user is fine' }).expect(201);
  });

  it('renames, moves and rejects cycles', async () => {
    const root = await createFolder(a, 'Root');
    const child = await createFolder(a, 'Child', root);
    const grand = await createFolder(a, 'Grand', child);

    const renamed = await a.patch(`${BASE}/${child}`).send({ name: ' Renamed ' }).expect(200);
    expect(renamed.body).toMatchObject({ name: 'Renamed', parentId: root });

    await a.patch(`${BASE}/${root}`).send({ parentId: root }).expect(400);
    await a.patch(`${BASE}/${root}`).send({ parentId: grand }).expect(400);

    const moved = await a.patch(`${BASE}/${grand}`).send({ parentId: null }).expect(200);
    expect((moved.body as FolderResponse).parentId).toBeNull();
    await a.patch(`${BASE}/${root}`).send({ parentId: grand }).expect(200);

    await a.patch(`${BASE}/${root}`).send({}).expect(200);
    await a.patch(`${BASE}/${root}`).send({ name: '' }).expect(400);
  });

  it('delete-links removes the subtree links and spares everything else', async () => {
    const root = await createFolder(a, 'Root');
    const child = await createFolder(a, 'Child', root);
    const sibling = await createFolder(a, 'Sibling');
    await addLink(users.owner.userId, { folderId: root });
    await addLink(users.owner.userId, { folderId: child });
    await addLink(users.owner.userId, { folderId: sibling });
    await addLink(users.owner.userId, {});
    const foreignFolder = await createFolder(b, 'B folder');
    await addLink(users.intruder.userId, { folderId: foreignFolder });

    await a.delete(`${BASE}/${root}?mode=${FOLDER_DELETE_MODE.DeleteLinks}`).expect(204);

    const body = await list(a);
    expect(body.items.map((f) => f.id)).toEqual([sibling]);
    expect(body.counts).toEqual({ all: 2, unsorted: 1, favorites: 0 });
    const other = await list(b);
    expect(other.items).toHaveLength(1);
    expect(other.counts.all).toBe(1);
  });

  it('move-to-unsorted keeps links as unsorted and deletes subfolders', async () => {
    const root = await createFolder(a, 'Root');
    const child = await createFolder(a, 'Child', root);
    await addLink(users.owner.userId, { folderId: root });
    await addLink(users.owner.userId, { folderId: child });

    await a.delete(`${BASE}/${root}?mode=${FOLDER_DELETE_MODE.MoveToUnsorted}`).expect(204);

    const body = await list(a);
    expect(body.items).toEqual([]);
    expect(body.counts).toEqual({ all: 2, unsorted: 2, favorites: 0 });
    await a.delete(`${BASE}/${root}?mode=${FOLDER_DELETE_MODE.MoveToUnsorted}`).expect(404);
  });

  it('a foreign move-to-unsorted delete is 404 and leaves the folder and links alone', async () => {
    const folder = await createFolder(a, 'Mine');
    const linkId = await addLink(users.owner.userId, { folderId: folder });

    await b.delete(`${BASE}/${folder}?mode=${FOLDER_DELETE_MODE.MoveToUnsorted}`).expect(404);

    expect((await list(a)).items.map((f) => f.id)).toEqual([folder]);
    const link = await t.db.prisma.link.findUnique({ where: { id: linkId } });
    expect(link?.folderId).toBe(folder);
  });

  it('requires a valid delete mode', async () => {
    const id = await createFolder(a, 'Root');
    await a.delete(`${BASE}/${id}`).expect(400);
    await a.delete(`${BASE}/${id}?mode=nope`).expect(400);
  });
});
