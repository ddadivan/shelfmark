import {
  FOLDER_DELETE_MODE,
  FOLDER_ERROR_MESSAGE,
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
const ORDER = `${BASE}/order`;

async function createFolder(agent: TestAgent, name: string, parentId?: string): Promise<string> {
  const res = await agent.post(BASE).send({ name, parentId }).expect(201);
  return (res.body as FolderResponse).id;
}

describe('folders API: manual order (#314)', () => {
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

  const list = async (agent: TestAgent): Promise<ListFoldersResponse> =>
    (await agent.get(BASE).expect(200)).body as ListFoldersResponse;

  /** Names of the subfolders of `parentId` in list order. */
  const children = async (agent: TestAgent, parentId: string | null): Promise<string[]> =>
    (await list(agent)).items.filter((f) => f.parentId === parentId).map((f) => f.name);

  it('data isolation: a foreign parent is 404 and its order stays', async () => {
    await expectIsolated(t.app, users, {
      create: (owner) => createFolder(owner, 'Parent'),
      read: (u, id) => u.get(`${BASE}/${id}`),
      update: (u, id) => u.put(ORDER).send({ parentId: id, ids: [] }),
      list: {
        request: (u) => u.get(BASE),
        ids: (body) => (body as ListFoldersResponse).items.map((f) => f.id),
      },
      skip: {
        remove: 'the order has no delete; folder deletes are covered in folders.integration',
        reference: 'the order is the only write here and is covered as update',
      },
    });
  });

  it("refuses another user's folders in the order and leaves both orders alone", async () => {
    const one = await createFolder(a, 'One');
    const two = await createFolder(a, 'Two');
    const own = await createFolder(b, 'Own');

    const foreign = await b
      .put(ORDER)
      .send({ parentId: null, ids: [two, one] })
      .expect(400);
    expect(foreign.body.message).toBe(FOLDER_ERROR_MESSAGE.OrderMismatch);
    await b
      .put(ORDER)
      .send({ parentId: null, ids: [own, one] })
      .expect(400);

    expect(await children(a, null)).toEqual(['One', 'Two']);
    expect(await children(b, null)).toEqual(['Own']);
  });

  it('puts new folders at the end of their parent, by creation, not by name', async () => {
    const zed = await createFolder(a, 'Zed');
    await createFolder(a, 'Alpha');
    await createFolder(a, 'Child B', zed);
    await createFolder(a, 'Child A', zed);

    expect(await children(a, null)).toEqual(['Zed', 'Alpha']);
    expect(await children(a, zed)).toEqual(['Child B', 'Child A']);
  });

  it('reorders the top level and one parent without touching updatedAt or other parents', async () => {
    const one = await createFolder(a, 'One');
    const two = await createFolder(a, 'Two');
    const three = await createFolder(a, 'Three');
    const inner1 = await createFolder(a, 'Inner 1', one);
    const inner2 = await createFolder(a, 'Inner 2', one);
    const before = await list(a);

    const res = await a
      .put(ORDER)
      .send({ parentId: null, ids: [three, one.toUpperCase(), two] })
      .expect(200);
    const body = res.body as ListFoldersResponse;
    expect(body.items.filter((f) => f.parentId === null).map((f) => f.name)).toEqual([
      'Three',
      'One',
      'Two',
    ]);
    expect(body.counts).toEqual(before.counts);
    for (const folder of body.items) {
      expect(folder.updatedAt).toBe(before.items.find((f) => f.id === folder.id)?.updatedAt);
    }
    expect(await children(a, one)).toEqual(['Inner 1', 'Inner 2']);

    await a
      .put(ORDER)
      .send({ parentId: one, ids: [inner2, inner1] })
      .expect(200);
    expect(await children(a, one)).toEqual(['Inner 2', 'Inner 1']);
    expect(await children(a, null)).toEqual(['Three', 'One', 'Two']);
  });

  it('refuses an order that is not exactly the live subfolders of that parent', async () => {
    const one = await createFolder(a, 'One');
    const two = await createFolder(a, 'Two');
    const inner = await createFolder(a, 'Inner', one);
    const gone = await createFolder(a, 'Gone');
    await a.delete(`${BASE}/${gone}?mode=${FOLDER_DELETE_MODE.DeleteLinks}`).expect(204);

    const bad: unknown[] = [
      [one],
      [one, two, two],
      [one, two, inner],
      [one, two, gone],
      [two, one, '0190a000-0000-7000-8000-000000000000'],
    ];
    for (const ids of bad) {
      const res = await a.put(ORDER).send({ parentId: null, ids }).expect(400);
      expect(res.body.message).toBe(FOLDER_ERROR_MESSAGE.OrderMismatch);
    }
    // The trashed one is not a sibling any more: the live two are enough.
    await a
      .put(ORDER)
      .send({ parentId: null, ids: [two, one] })
      .expect(200);
    expect(await children(a, null)).toEqual(['Two', 'One']);
  });

  it('validates the body', async () => {
    const one = await createFolder(a, 'One');
    await a
      .put(ORDER)
      .send({ ids: [one] })
      .expect(400);
    await a
      .put(ORDER)
      .send({ parentId: 'nope', ids: [one] })
      .expect(400);
    await a
      .put(ORDER)
      .send({ parentId: null, ids: ['nope'] })
      .expect(400);
    await a.put(ORDER).send({ parentId: null, ids: one }).expect(400);
    await a
      .put(ORDER)
      .send({ parentId: null, ids: [one], extra: 1 })
      .expect(400);
    await a
      .put(ORDER)
      .send({ parentId: null, ids: Array.from({ length: 501 }, () => one) })
      .expect(400);
  });

  it('a trashed parent is 404', async () => {
    const parent = await createFolder(a, 'Parent');
    await a.delete(`${BASE}/${parent}?mode=${FOLDER_DELETE_MODE.DeleteLinks}`).expect(204);
    await a.put(ORDER).send({ parentId: parent, ids: [] }).expect(404);
  });

  it('a move lands at the end of the new parent; a rename keeps the place', async () => {
    const target = await createFolder(a, 'Target');
    await createFolder(a, 'B inside', target);
    await createFolder(a, 'C inside', target);
    const mover = await createFolder(a, 'A mover');

    await a.patch(`${BASE}/${mover}`).send({ parentId: target }).expect(200);
    expect(await children(a, target)).toEqual(['B inside', 'C inside', 'A mover']);

    const first = (await list(a)).items.find((f) => f.name === 'B inside');
    await a.patch(`${BASE}/${first?.id}`).send({ name: 'Z renamed' }).expect(200);
    expect(await children(a, target)).toEqual(['Z renamed', 'C inside', 'A mover']);

    // Sending the same parent again is not a move.
    await a.patch(`${BASE}/${first?.id}`).send({ parentId: target }).expect(200);
    expect(await children(a, target)).toEqual(['Z renamed', 'C inside', 'A mover']);
  });
});
